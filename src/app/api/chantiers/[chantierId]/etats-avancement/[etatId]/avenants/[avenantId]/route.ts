import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]/avenants/[avenantId]
export async function PUT(
  request: Request,
  { params }: { params: { chantierId: string; etatId: string; avenantId: string } }
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
    const {
      article,
      description,
      type,
      unite,
      prixUnitaire,
      quantite,
      quantiteActuelle,
      quantiteTotale,
      montantActuel,
      montantTotal
    } = body

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

    // Vérifier que l'avenant appartient à l'état d'avancement
    const avenant = await prisma.avenantEtatAvancement.findFirst({
      where: {
        id: parseInt(params.avenantId),
        etatAvancementId: etatAvancement.id
      }
    })

    if (!avenant) {
      return NextResponse.json(
        { error: 'Avenant non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour l'avenant
    const updatedAvenant = await prisma.avenantEtatAvancement.update({
      where: {
        id: parseInt(params.avenantId)
      },
      data: {
        article,
        description,
        type,
        unite,
        prixUnitaire,
        quantite,
        quantiteActuelle,
        quantiteTotale,
        montantActuel,
        montantTotal
      }
    })

    return NextResponse.json(updatedAvenant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'avenant' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/etats-avancement/[etatId]/avenants/[avenantId]
export async function DELETE(
  request: Request,
  { params }: { params: { chantierId: string; etatId: string; avenantId: string } }
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

    if (etatAvancement.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement est finalisé' },
        { status: 400 }
      )
    }

    // Vérifier que l'avenant appartient à l'état d'avancement
    const avenant = await prisma.avenantEtatAvancement.findFirst({
      where: {
        id: parseInt(params.avenantId),
        etatAvancementId: etatAvancement.id
      }
    })

    if (!avenant) {
      return NextResponse.json(
        { error: 'Avenant non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer l'avenant
    await prisma.avenantEtatAvancement.delete({
      where: {
        id: parseInt(params.avenantId)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'avenant' },
      { status: 500 }
    )
  }
} 