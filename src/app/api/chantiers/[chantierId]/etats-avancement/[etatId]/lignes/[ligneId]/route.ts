import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// DELETE /api/chantiers/[chantierId]/etats-avancement/[etatId]/lignes/[ligneId]
export async function DELETE(
  request: Request,
  { params }: { params: { chantierId: string; etatId: string; ligneId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que l'état d'avancement existe et appartient au chantier
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: params.chantierId,
        numero: parseInt(params.etatId)
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que la ligne appartient à l'état d'avancement
    const ligne = await prisma.ligneEtatAvancement.findFirst({
      where: {
        id: parseInt(params.ligneId),
        etatAvancementId: etatAvancement.id
      }
    })

    if (!ligne) {
      return NextResponse.json(
        { error: 'Ligne non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer la ligne
    await prisma.ligneEtatAvancement.delete({
      where: {
        id: parseInt(params.ligneId)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la ligne' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]/lignes/[ligneId]
export async function PUT(
  request: Request,
  { params }: { params: { chantierId: string; etatId: string; ligneId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { quantiteActuelle, quantiteTotale, montantActuel, montantTotal } = body

    // Vérifier que l'état d'avancement existe et appartient au chantier
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: params.chantierId,
        numero: parseInt(params.etatId)
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    if (etatAvancement.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement est finalisé' },
        { status: 400 }
      )
    }

    // Vérifier que la ligne appartient à l'état d'avancement
    const ligne = await prisma.ligneEtatAvancement.findFirst({
      where: {
        id: parseInt(params.ligneId),
        etatAvancementId: etatAvancement.id
      }
    })

    if (!ligne) {
      return NextResponse.json(
        { error: 'Ligne non trouvée' },
        { status: 404 }
      )
    }

    // Mettre à jour la ligne
    const updatedLigne = await prisma.ligneEtatAvancement.update({
      where: {
        id: parseInt(params.ligneId)
      },
      data: {
        quantiteActuelle,
        quantiteTotale,
        montantActuel,
        montantTotal
      }
    })

    return NextResponse.json(updatedLigne)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ligne' },
      { status: 500 }
    )
  }
} 