import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LigneEtatAvancement, AvenantEtatAvancement, EtatAvancement } from '@prisma/client'
import { Prisma } from '@prisma/client'

// Définition des types avec les relations
type EtatAvancementWithRelations = EtatAvancement & {
  lignes: LigneEtatAvancement[];
  avenants: AvenantEtatAvancement[];
}

// GET /api/chantiers/[chantierId]/etats-avancement/[etatId]
export async function GET(
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

    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: params.chantierId,
        numero: parseInt(params.etatId)
      },
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    }) as EtatAvancementWithRelations | null

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Calculer les totaux
    const totaux = {
      montantPrecedent: etatAvancement.lignes.reduce((sum: number, ligne: LigneEtatAvancement) => sum + ligne.montantPrecedent, 0),
      montantActuel: etatAvancement.lignes.reduce((sum: number, ligne: LigneEtatAvancement) => sum + ligne.montantActuel, 0),
      montantTotal: etatAvancement.lignes.reduce((sum: number, ligne: LigneEtatAvancement) => sum + ligne.montantTotal, 0),
      montantAvenants: etatAvancement.avenants.reduce((sum: number, avenant: AvenantEtatAvancement) => sum + avenant.montantTotal, 0)
    }

    return NextResponse.json({
      ...etatAvancement,
      totaux
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]
export async function PUT(
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

    // Construire dynamiquement l'objet data en fonction des champs présents dans la requête
    const updateData: any = {};
    
    if (body.commentaires !== undefined) updateData.commentaires = body.commentaires;
    if (body.estFinalise !== undefined) updateData.estFinalise = body.estFinalise;
    if (body.mois !== undefined) updateData.mois = body.mois;

    const etatAvancement = await prisma.etatAvancement.update({
      where: {
        chantierId_numero: {
          chantierId: params.chantierId,
          numero: parseInt(params.etatId)
        }
      },
      data: updateData,
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    }) as EtatAvancementWithRelations

    return NextResponse.json(etatAvancement)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/etats-avancement/[etatId]
export async function DELETE(
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

    // Supprimer l'état d'avancement (les lignes et avenants seront supprimés automatiquement grâce aux relations onDelete: Cascade)
    await prisma.etatAvancement.delete({
      where: {
        id: etatAvancement.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 