import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: { chantierId: string; soustraitantId: string; commandeId: string; ligneId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que la commande existe et n'est pas verrouillée
    const commande = await prisma.$queryRaw`
      SELECT * FROM commande_soustraitant
      WHERE id = ${parseInt(params.commandeId)}
      AND chantierId = ${params.chantierId}
      AND soustraitantId = ${params.soustraitantId}
    ` as any[]

    if (!commande || commande.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    if (commande[0].estVerrouillee) {
      return NextResponse.json(
        { error: 'La commande est verrouillée et ne peut pas être modifiée' },
        { status: 400 }
      )
    }

    // Récupérer les données de la ligne
    const { description, prixUnitaire, quantite } = await request.json()
    
    // Vérifier que la ligne existe
    const ligne = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE id = ${parseInt(params.ligneId)}
      AND commandeSousTraitantId = ${parseInt(params.commandeId)}
    ` as any[]

    if (!ligne || ligne.length === 0) {
      return NextResponse.json(
        { error: 'Ligne de commande non trouvée' },
        { status: 404 }
      )
    }

    // Calculer le nouveau total
    const total = parseFloat(prixUnitaire) * parseFloat(quantite)

    // Mettre à jour la ligne
    await prisma.$executeRaw`
      UPDATE ligne_commande_soustraitant
      SET 
        description = ${description || ligne[0].description},
        prixUnitaire = ${parseFloat(prixUnitaire) || ligne[0].prixUnitaire},
        quantite = ${parseFloat(quantite) || ligne[0].quantite},
        total = ${total},
        updatedAt = NOW()
      WHERE id = ${parseInt(params.ligneId)}
    `

    // Recalculer les totaux de la commande
    const lignes = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(params.commandeId)}
    ` as any[]

    const sousTotal = lignes.reduce((sum: number, l: any) => sum + parseFloat(l.total), 0)
    const tva = sousTotal * parseFloat(commande[0].tauxTVA) / 100
    const totalCommande = sousTotal + tva

    // Mettre à jour la commande
    await prisma.$executeRaw`
      UPDATE commande_soustraitant
      SET 
        sousTotal = ${sousTotal},
        tva = ${tva},
        total = ${totalCommande},
        updatedAt = NOW()
      WHERE id = ${parseInt(params.commandeId)}
    `

    // Récupérer la ligne mise à jour
    const ligneMiseAJour = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE id = ${parseInt(params.ligneId)}
    ` as any[]

    return NextResponse.json(ligneMiseAJour[0])
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ligne de commande' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { chantierId: string; soustraitantId: string; commandeId: string; ligneId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que la commande existe et n'est pas verrouillée
    const commande = await prisma.$queryRaw`
      SELECT * FROM commande_soustraitant
      WHERE id = ${parseInt(params.commandeId)}
      AND chantierId = ${params.chantierId}
      AND soustraitantId = ${params.soustraitantId}
    ` as any[]

    if (!commande || commande.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    if (commande[0].estVerrouillee) {
      return NextResponse.json(
        { error: 'La commande est verrouillée et ne peut pas être modifiée' },
        { status: 400 }
      )
    }

    // Vérifier que la ligne existe
    const ligne = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE id = ${parseInt(params.ligneId)}
      AND commandeSousTraitantId = ${parseInt(params.commandeId)}
    ` as any[]

    if (!ligne || ligne.length === 0) {
      return NextResponse.json(
        { error: 'Ligne de commande non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer la ligne
    await prisma.$executeRaw`
      DELETE FROM ligne_commande_soustraitant
      WHERE id = ${parseInt(params.ligneId)}
    `

    // Recalculer les totaux de la commande
    const lignes = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(params.commandeId)}
    ` as any[]

    const sousTotal = lignes.reduce((sum: number, l: any) => sum + parseFloat(l.total), 0)
    const tva = sousTotal * parseFloat(commande[0].tauxTVA) / 100
    const totalCommande = sousTotal + tva

    // Mettre à jour la commande
    await prisma.$executeRaw`
      UPDATE commande_soustraitant
      SET 
        sousTotal = ${sousTotal},
        tva = ${tva},
        total = ${totalCommande},
        updatedAt = NOW()
      WHERE id = ${parseInt(params.commandeId)}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la ligne de commande' },
      { status: 500 }
    )
  }
} 