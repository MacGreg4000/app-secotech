import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import {
  persistRapportPhoto,
  generateRapportDocuments,
  cleanTags,
  type RapportNoteInput,
  type RapportPhotoInput,
} from '@/lib/rapports/service'

export const dynamic = 'force-dynamic'

// GET /api/chantiers/[chantierId]/rapports — liste des rapports (modèle durable)
export async function GET(_request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const { chantierId } = await props.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rapports = await prisma.rapport.findMany({
    where: { chantierId },
    orderBy: { date: 'desc' },
    include: {
      documents: { select: { id: true, type: true, url: true, nom: true, tagKey: true } },
      _count: { select: { photos: true, notes: true } },
    },
  })
  return NextResponse.json(rapports)
}

// POST /api/chantiers/[chantierId]/rapports — créer un rapport durable + générer les PDF
export async function POST(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const { chantierId } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true, chantierId: true, nomChantier: true, clientNom: true, adresseChantier: true },
    })
    if (!chantier) return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })

    const body = await request.json()
    const date: string = body.date || new Date().toISOString()
    const personnes: Array<{ id?: string; nom: string; fonction: string }> = Array.isArray(body.personnes) ? body.personnes : []
    const notesInput: RapportNoteInput[] = Array.isArray(body.notes) ? body.notes : []
    const photosInput: RapportPhotoInput[] = Array.isArray(body.photos) ? body.photos : []

    if (notesInput.length === 0 && photosInput.length === 0) {
      return NextResponse.json({ error: 'Ajoutez au moins une note ou une photo' }, { status: 400 })
    }

    // 1) Créer le rapport
    const rapport = await prisma.rapport.create({
      data: {
        chantierId: chantier.chantierId,
        date: new Date(date),
        createdBy: session.user.id,
        personnes: personnes as unknown as object,
      },
      select: { id: true },
    })

    // 2) Notes
    const notes = notesInput
      .filter(n => (n.contenu || '').trim().length > 0)
      .map((n, i) => ({ contenu: n.contenu.trim(), tags: cleanTags(n.tags), ordre: i }))
    if (notes.length > 0) {
      await prisma.rapportNote.createMany({
        data: notes.map(n => ({ rapportId: rapport.id, contenu: n.contenu, tags: n.tags, ordre: n.ordre })),
      })
    }

    // 3) Photos — copie durable + lignes RapportPhoto
    const photos: Array<{ url: string; annotation: string; tags: string[] }> = []
    for (let i = 0; i < photosInput.length; i++) {
      const p = photosInput[i]
      const durableUrl = await persistRapportPhoto(rapport.id, p.url, i)
      const tags = cleanTags(p.tags)
      const annotation = p.annotation || ''
      await prisma.rapportPhoto.create({
        data: { rapportId: rapport.id, url: durableUrl, annotation, tags, ordre: i, documentId: p.documentId ?? null },
      })
      photos.push({ url: durableUrl, annotation, tags })
    }

    // 4) Générer PDF général + variantes par tag et créer les Document liés
    await generateRapportDocuments({
      rapportId: rapport.id,
      chantier,
      createdBy: session.user.id,
      date,
      personnes,
      notes: notes.map(n => ({ contenu: n.contenu, tags: n.tags })),
      photos,
    })

    const full = await prisma.rapport.findUnique({
      where: { id: rapport.id },
      include: { notes: true, photos: true, documents: { select: { id: true, type: true, url: true, nom: true, tagKey: true } } },
    })
    return NextResponse.json(full, { status: 201 })
  } catch (error) {
    console.error('Erreur création rapport:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du rapport' }, { status: 500 })
  }
}
