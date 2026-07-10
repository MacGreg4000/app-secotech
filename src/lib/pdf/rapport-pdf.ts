import { readFile } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'
import { PDFGenerator } from './pdf-generator'
import { generateRapportHTML, type RapportData } from './templates/rapport-template'

// Dimension max et qualité des photos embarquées dans le PDF.
// Un rapport A4 n'a pas besoin du 1920px d'origine : on réduit fortement le
// poids pour éviter la saturation mémoire de Puppeteer et alléger le PDF.
const PDF_PHOTO_MAX_DIM = 1200
const PDF_PHOTO_QUALITY = 70

type PhotoInput = {
  url?: string
  preview?: string
  annotation?: string
  caption?: string
  tags?: string[]
}

export interface RapportPdfInput {
  chantier: RapportData['chantier']
  date: string
  personnes: RapportData['personnes']
  notes: RapportData['notes']
  photos: PhotoInput[]
  /** Tag de filtrage pour une variante ; absent/'Tous' = rapport général. */
  tagFilter?: string
}

async function loadLogoBase64(): Promise<string> {
  try {
    const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
    const logoBuffer = await readFile(logoPath)
    return logoBuffer.toString('base64')
  } catch (error) {
    console.warn('Impossible de charger le logo:', error)
    return ''
  }
}

/**
 * Convertit les photos en data-URI base64, redimensionnées via sharp.
 * Accepte `preview` OU `url` (chemin /uploads/...) et normalise `caption`→`annotation`.
 */
async function photosToBase64(photos: PhotoInput[]): Promise<RapportData['photos']> {
  return Promise.all(
    (photos || []).map(async (photo) => {
      const source = photo.preview || photo.url
      const annotation = photo.annotation ?? photo.caption ?? ''
      const tags = photo.tags ?? []
      try {
        if (source && source.startsWith('/uploads/')) {
          const imagePath = join(process.cwd(), 'public', source)
          const imageBuffer = await readFile(imagePath)
          let outputBuffer: Buffer = imageBuffer
          let mimeType = 'image/jpeg'
          try {
            outputBuffer = await sharp(imageBuffer)
              .rotate() // respecter l'orientation EXIF (photos de téléphone)
              .resize(PDF_PHOTO_MAX_DIM, PDF_PHOTO_MAX_DIM, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: PDF_PHOTO_QUALITY })
              .toBuffer()
          } catch (resizeErr) {
            console.warn(`⚠️ Redimensionnement impossible pour ${source}, image d'origine conservée:`, resizeErr)
            const extension = source.split('.').pop()?.toLowerCase() || 'jpg'
            mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
          }
          return {
            preview: `data:${mimeType};base64,${outputBuffer.toString('base64')}`,
            annotation,
            tags,
          }
        }
        // Déjà en base64 ou source inconnue : garder tel quel
        return { preview: source || '', annotation, tags }
      } catch (error) {
        console.error(`❌ Erreur conversion photo ${source}:`, error)
        return { preview: source || '', annotation, tags }
      }
    })
  )
}

/**
 * Génère le PDF d'un rapport de visite (général ou variante par tag) et
 * renvoie le buffer. Cœur partagé entre la route `generate-pdf-modern` et la
 * route serveur de création/mise à jour de rapport.
 */
export async function generateRapportPdfBuffer(input: RapportPdfInput): Promise<Buffer> {
  const logoBase64 = await loadLogoBase64()
  const photos = await photosToBase64(input.photos)

  const rapportData: RapportData = {
    chantier: input.chantier,
    date: input.date,
    personnes: input.personnes || [],
    notes: input.notes || [],
    photos,
    tagFilter: input.tagFilter,
    logoBase64,
  }

  const html = generateRapportHTML(rapportData)
  const pdfBuffer = await PDFGenerator.generatePDF(html, {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
  })
  return Buffer.from(pdfBuffer)
}
