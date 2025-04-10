import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/chantiers/[chantierId]/etats-avancement/[etatId]/avenants
export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

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

    const avenant = await prisma.avenantEtatAvancement.create({
      data: {
        etatAvancementId: etatAvancement.id,
        article: body.article,
        description: body.description,
        type: body.type,
        unite: body.unite,
        prixUnitaire: body.prixUnitaire,
        quantite: body.quantite,
        quantitePrecedente: body.quantitePrecedente || 0,
        quantiteActuelle: body.quantiteActuelle || 0,
        quantiteTotale: body.quantiteTotale || 0,
        montantPrecedent: body.montantPrecedent || 0,
        montantActuel: body.montantActuel || 0,
        montantTotal: body.montantTotal || 0
      }
    })

    return NextResponse.json(avenant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'avenant' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]/avenants/[avenantId]
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string; avenantId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const avenant = await prisma.avenantEtatAvancement.update({
      where: {
        id: parseInt(params.avenantId)
      },
      data: {
        article: body.article !== undefined ? body.article : undefined,
        description: body.description !== undefined ? body.description : undefined,
        type: body.type !== undefined ? body.type : undefined,
        unite: body.unite !== undefined ? body.unite : undefined,
        prixUnitaire: body.prixUnitaire !== undefined ? body.prixUnitaire : undefined,
        quantite: body.quantite !== undefined ? body.quantite : undefined,
        quantiteActuelle: body.quantiteActuelle,
        quantiteTotale: body.quantiteTotale,
        montantActuel: body.montantActuel,
        montantTotal: body.montantTotal
      }
    })

    return NextResponse.json(avenant)
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
  props: { params: Promise<{ chantierId: string; etatId: string; avenantId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

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