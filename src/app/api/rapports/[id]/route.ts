import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { unlink } from 'fs/promises'
import { join } from 'path'
import {
  persistRapportPhoto,
  generateRapportDocuments,
  cleanTags,
  type RapportNoteInput,
  type RapportPhotoInput,
} from '@/lib/rapports/service'

export const dynamic = 'force-dynamic'

const PUBLIC_DIR = join(process.cwd(), 'public')

async function removeFileForUrl(url: string | null | undefined) {
  if (!url || !url.startsWith('/uploads/')) return
  try {
    await unlink(join(PUBLIC_DIR, url))
  } catch {
    // fichier déjà absent : ignorer
  }
}

// GET /api/rapports/[id] — rapport complet pour l'édition
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rapport = await prisma.rapport.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { ordre: 'asc' } },
      photos: { orderBy: { ordre: 'asc' } },
      documents: { select: { id: true, type: true, url: true, nom: true, tagKey: true } },
      chantier: { select: { chantierId: true, nomChantier: true } },
    },
  })
  if (!rapport) return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })
  return NextResponse.json(rapport)
}

// PUT /api/rapports/[id] — mise à jour (remplace notes/photos, régénère les PDF)
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const existing = await prisma.rapport.findUnique({
      where: { id },
      include: {
        documents: { select: { id: true, url: true } },
        photos: { select: { url: true } },
        chantier: { select: { id: true, chantierId: true, nomChantier: true, clientNom: true, adresseChantier: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })

    const body = await request.json()
    const date: string = body.date || existing.date.toISOString()
    const personnes: Array<{ id?: string; nom: string; fonction: string }> = Array.isArray(body.personnes) ? body.personnes : []
    const notesInput: RapportNoteInput[] = Array.isArray(body.notes) ? body.notes : []
    const photosInput: RapportPhotoInput[] = Array.isArray(body.photos) ? body.photos : []

    // 1) Supprimer les anciens PDF (Document + fichiers) et anciennes photos durables
    for (const doc of existing.documents) {
      await removeFileForUrl(doc.url)
    }
    await prisma.document.deleteMany({ where: { rapportId: id } })
    for (const ph of existing.photos) {
      await removeFileForUrl(ph.url)
    }
    await prisma.rapportPhoto.deleteMany({ where: { rapportId: id } })
    await prisma.rapportNote.deleteMany({ where: { rapportId: id } })

    // 2) Mettre à jour le rapport
    await prisma.rapport.update({
      where: { id },
      data: { date: new Date(date), personnes: personnes as unknown as object },
    })

    // 3) Recréer notes
    const notes = notesInput
      .filter(n => (n.contenu || '').trim().length > 0)
      .map((n, i) => ({ contenu: n.contenu.trim(), tags: cleanTags(n.tags), ordre: i }))
    if (notes.length > 0) {
      await prisma.rapportNote.createMany({
        data: notes.map(n => ({ rapportId: id, contenu: n.contenu, tags: n.tags, ordre: n.ordre })),
      })
    }

    // 4) Recréer photos (copie durable)
    const photos: Array<{ url: string; annotation: string; tags: string[] }> = []
    for (let i = 0; i < photosInput.length; i++) {
      const p = photosInput[i]
      const durableUrl = await persistRapportPhoto(id, p.url, i)
      const tags = cleanTags(p.tags)
      const annotation = p.annotation || ''
      await prisma.rapportPhoto.create({
        data: { rapportId: id, url: durableUrl, annotation, tags, ordre: i, documentId: p.documentId ?? null },
      })
      photos.push({ url: durableUrl, annotation, tags })
    }

    // 5) Régénérer les PDF
    await generateRapportDocuments({
      rapportId: id,
      chantier: existing.chantier,
      createdBy: session.user.id,
      date,
      personnes,
      notes: notes.map(n => ({ contenu: n.contenu, tags: n.tags })),
      photos,
    })

    const full = await prisma.rapport.findUnique({
      where: { id },
      include: { notes: true, photos: true, documents: { select: { id: true, type: true, url: true, nom: true, tagKey: true } } },
    })
    return NextResponse.json(full)
  } catch (error) {
    console.error('Erreur mise à jour rapport:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du rapport' }, { status: 500 })
  }
}

// DELETE /api/rapports/[id] — supprime le rapport, ses PDF et fichiers
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const existing = await prisma.rapport.findUnique({
      where: { id },
      include: { documents: { select: { url: true } }, photos: { select: { url: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })

    for (const doc of existing.documents) await removeFileForUrl(doc.url)
    for (const ph of existing.photos) await removeFileForUrl(ph.url)

    // Cascade sur notes/photos ; on détache/supprime les Document liés
    await prisma.document.deleteMany({ where: { rapportId: id } })
    await prisma.rapport.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression rapport:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du rapport' }, { status: 500 })
  }
}
