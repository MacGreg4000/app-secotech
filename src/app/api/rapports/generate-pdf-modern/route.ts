import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateRapportPdfBuffer } from '@/lib/pdf/rapport-pdf'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { chantierId, date, personnes, notes, photos, tagFilter } = body

    console.log(`🎯 Génération PDF moderne - Rapport pour chantier ${chantierId}`)

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: {
        id: true,
        chantierId: true,
        nomChantier: true,
        clientNom: true,
        adresseChantier: true
      }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Normaliser les notes (chaîne unique ou tableau structuré)
    const notesArray = Array.isArray(notes)
      ? notes
      : (notes ? [{ id: '1', contenu: notes, tags: [] }] : [])

    const pdfBuffer = await generateRapportPdfBuffer({
      chantier: {
        id: chantier.id,
        chantierId: chantier.chantierId,
        nomChantier: chantier.nomChantier,
        clientNom: chantier.clientNom || 'Client non spécifié',
        adresseChantier: chantier.adresseChantier || ''
      },
      date,
      personnes: personnes || [],
      notes: notesArray,
      photos: photos || [],
      tagFilter,
    })

    console.log('✅ PDF généré avec succès')

    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-${chantier.chantierId}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF de rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
