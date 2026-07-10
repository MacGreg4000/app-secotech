import { prisma } from '@/lib/prisma/client'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { generateRapportPdfBuffer } from '@/lib/pdf/rapport-pdf'
import { canonicalTagName, dedupeTags, normalizeTagKey } from '@/lib/utils/tags'

const PUBLIC_DIR = join(process.cwd(), 'public')

export interface RapportChantier {
  id: number
  chantierId: string
  nomChantier: string
  clientNom: string
  adresseChantier: string
}

export interface RapportNoteInput {
  contenu: string
  tags?: string[]
}

export interface RapportPhotoInput {
  /** URL source de la photo déjà uploadée (/uploads/...). */
  url: string
  annotation?: string
  tags?: string[]
  documentId?: number | null
}

/**
 * Copie une photo (déjà uploadée sous /uploads/...) vers l'emplacement durable
 * du rapport et renvoie l'URL publique durable. En cas d'échec de lecture, on
 * conserve l'URL source (le PDF gérera l'absence en la sautant).
 */
export async function persistRapportPhoto(
  rapportId: string,
  sourceUrl: string,
  ordre: number
): Promise<string> {
  try {
    if (!sourceUrl || !sourceUrl.startsWith('/uploads/')) return sourceUrl
    const sourcePath = join(PUBLIC_DIR, sourceUrl)
    const buffer = await readFile(sourcePath)
    const ext = (sourceUrl.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const dir = join(PUBLIC_DIR, 'uploads', 'rapports', rapportId)
    await mkdir(dir, { recursive: true })
    const filename = `photo_${ordre + 1}.${ext}`
    await writeFile(join(dir, filename), buffer)
    return `/uploads/rapports/${rapportId}/${filename}`
  } catch (err) {
    console.warn(`⚠️ persistRapportPhoto: copie durable impossible pour ${sourceUrl}:`, err)
    return sourceUrl
  }
}

/**
 * Union normalisée (dédupliquée, insensible casse/accents) de tous les tags
 * portés par les notes et les photos d'un rapport.
 */
export function collectRapportTags(
  notes: RapportNoteInput[],
  photos: RapportPhotoInput[]
): string[] {
  const all: string[] = []
  for (const n of notes) all.push(...(n.tags || []))
  for (const p of photos) all.push(...(p.tags || []))
  return dedupeTags(all)
}

/**
 * Clé de fichier « sûre » pour une variante par tag (nom de fichier).
 */
function safeTagSlug(tag: string): string {
  return normalizeTagKey(tag).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tag'
}

interface GenerateDocsArgs {
  rapportId: string
  chantier: RapportChantier
  createdBy: string
  date: string
  personnes: Array<{ id?: string; nom: string; fonction: string }>
  notes: Array<{ contenu: string; tags: string[] }>
  photos: Array<{ url: string; annotation: string; tags: string[] }>
}

/**
 * Génère le PDF général + un PDF par tag et crée les `Document` correspondants
 * (liés au rapport via `rapportId`, chaque variante portant son `tagKey`).
 * Renvoie les documents créés.
 */
export async function generateRapportDocuments(args: GenerateDocsArgs) {
  const { rapportId, chantier, createdBy, date, personnes, notes, photos } = args

  const notesForPdf = notes.map((n, i) => ({ id: String(i + 1), contenu: n.contenu, tags: n.tags }))
  const photosForPdf = photos.map(p => ({ preview: p.url, url: p.url, annotation: p.annotation, tags: p.tags }))

  const docsDir = join(PUBLIC_DIR, 'uploads', 'documents', chantier.chantierId)
  await mkdir(docsDir, { recursive: true })

  const dateStr = date.split('T')[0]
  const safeNom = chantier.nomChantier.replace(/\s+/g, '-')

  const created: Array<{ id: number; type: string; url: string; tagKey: string | null }> = []

  const writePdf = async (opts: {
    type: string
    tagFilter?: string
    tagKey?: string | null
    filenameSuffix: string
  }) => {
    const buffer = await generateRapportPdfBuffer({
      chantier, date, personnes, notes: notesForPdf, photos: photosForPdf, tagFilter: opts.tagFilter,
    })
    const filename = `rapport-visite-${safeNom}-${opts.filenameSuffix}-${dateStr}-${Date.now()}.pdf`
    await writeFile(join(docsDir, filename), buffer)
    const url = `/uploads/documents/${chantier.chantierId}/${filename}`
    const doc = await prisma.document.create({
      data: {
        nom: filename,
        type: opts.type,
        url,
        taille: buffer.length,
        mimeType: 'application/pdf',
        chantierId: chantier.chantierId,
        createdBy,
        rapportId,
        tagKey: opts.tagKey ?? null,
        updatedAt: new Date(),
      },
      select: { id: true, type: true, url: true, tagKey: true },
    })
    created.push(doc)
  }

  // PDF général
  await writePdf({ type: 'rapport-visite-general', filenameSuffix: 'general' })

  // Une variante par tag
  const tags = collectRapportTags(
    notes.map(n => ({ contenu: n.contenu, tags: n.tags })),
    photos.map(p => ({ url: p.url, tags: p.tags }))
  )
  for (const tag of tags) {
    await writePdf({
      type: `rapport-visite-tag-${safeTagSlug(tag)}`,
      tagFilter: tag,
      tagKey: normalizeTagKey(tag),
      filenameSuffix: `tag-${safeTagSlug(tag)}`,
    })
  }

  return created
}

/**
 * Normalise/canonicalise les tags d'entrée d'une note ou photo.
 */
export function cleanTags(tags?: string[]): string[] {
  return dedupeTags((tags || []).map(canonicalTagName))
}
