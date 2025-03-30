import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]/lignes/[ligneId]
export async function PUT(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string; ligneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { chantierId, soustraitantId, etatId, ligneId } = await context.params
    const body = await request.json()

    const ligne = await prisma.ligne_soustraitant_etat_avancement.update({
      where: {
        id: parseInt(ligneId)
      },
      data: {
        quantiteActuelle: body.quantiteActuelle,
        quantiteTotale: body.quantiteTotale,
        montantActuel: body.montantActuel,
        montantTotal: body.montantTotal
      }
    })

    return NextResponse.json(ligne)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ligne' },
      { status: 500 }
    )
  }
} 