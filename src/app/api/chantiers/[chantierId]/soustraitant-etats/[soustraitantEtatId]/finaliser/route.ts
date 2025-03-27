import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Finaliser un état d'avancement sous-traitant
export async function POST(
  request: NextRequest,
  { params }: { params: { chantierId: string; soustraitantEtatId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, soustraitantEtatId } = params

    // Vérifier que l'état d'avancement existe
    const existingEtat = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(soustraitantEtatId)
      },
      include: {
        etat_avancement: true,
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true
      }
    })

    if (!existingEtat) {
      return NextResponse.json(
        { error: 'État d\'avancement sous-traitant non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérifier si l'état correspond au chantier
    if (existingEtat.etat_avancement.chantierId !== params.chantierId) {
      return NextResponse.json(
        { error: 'État d\'avancement sous-traitant ne correspond pas au chantier' },
        { status: 400 }
      )
    }

    // Vérifier si l'état est déjà finalisé
    if (existingEtat.estFinalise) {
      return NextResponse.json(
        { error: 'Cet état d\'avancement est déjà finalisé' },
        { status: 400 }
      )
    }

    // Finaliser l'état d'avancement
    await prisma.soustraitant_etat_avancement.update({
      where: {
        id: parseInt(soustraitantEtatId)
      },
      data: {
        estFinalise: true
      }
    })

    // Si c'est le dernier état d'avancement, mettre à jour les quantités précédentes
    // pour le prochain état d'avancement
    const nextEtatNumero = existingEtat.numero + 1
    
    // Créer un nouvel état d'avancement avec les quantités précédentes mises à jour
    const newEtat = await prisma.soustraitant_etat_avancement.create({
      data: {
        soustraitantId: existingEtat.soustraitantId,
        etatAvancementId: existingEtat.etatAvancementId,
        commandeSousTraitantId: existingEtat.commandeSousTraitantId,
        numero: nextEtatNumero,
        date: new Date(),
        commentaires: '',
        estFinalise: false,
        ligne_soustraitant_etat_avancement: {
          create: existingEtat.ligne_soustraitant_etat_avancement.map(ligne => ({
            article: ligne.article,
            description: ligne.description,
            type: ligne.type,
            unite: ligne.unite,
            prixUnitaire: ligne.prixUnitaire,
            quantite: ligne.quantite,
            quantitePrecedente: ligne.quantiteTotale,
            quantiteActuelle: 0,
            montantPrecedent: ligne.montantTotal,
            montantActuel: 0,
            quantiteTotale: ligne.quantiteTotale,
            montantTotal: ligne.montantTotal,
            updatedAt: new Date()
          }))
        },
        avenant_soustraitant_etat_avancement: {
          create: existingEtat.avenant_soustraitant_etat_avancement.map(avenant => ({
            article: avenant.article,
            description: avenant.description,
            type: avenant.type,
            unite: avenant.unite,
            prixUnitaire: avenant.prixUnitaire,
            quantite: avenant.quantite,
            quantitePrecedente: avenant.quantiteTotale,
            quantiteActuelle: 0,
            montantPrecedent: avenant.montantTotal,
            montantActuel: 0,
            quantiteTotale: avenant.quantiteTotale,
            montantTotal: avenant.montantTotal,
            updatedAt: new Date()
          }))
        }
      }
    })

    return NextResponse.json({ 
      success: true,
      newEtatId: newEtat.id
    })
  } catch (error) {
    console.error('Erreur lors de la finalisation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la finalisation de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 