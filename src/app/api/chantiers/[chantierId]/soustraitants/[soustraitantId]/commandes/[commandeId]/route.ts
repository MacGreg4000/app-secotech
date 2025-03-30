import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    const soustraitantId = params.soustraitantId;
    const commandeId = params.commandeId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer la commande sous-traitant
    const commande = await prisma.$queryRaw`
      SELECT 
        c.*,
        ch.nomChantier,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail,
        s.contact as soustraitantContact,
        s.adresse as soustraitantAdresse,
        s.telephone as soustraitantTelephone,
        s.tva as soustraitantTVA
      FROM commande_soustraitant c
      JOIN chantier ch ON c.chantierId = ch.chantierId
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.id = ${parseInt(commandeId)}
      AND c.chantierId = ${chantierId}
      AND c.soustraitantId = ${soustraitantId}
    ` as any[]

    if (!commande || commande.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer les lignes de commande
    const lignes = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(commandeId)}
      ORDER BY ordre ASC
    ` as any[]

    return NextResponse.json({
      ...commande[0],
      lignes
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la commande sous-traitant' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    const soustraitantId = params.soustraitantId;
    const commandeId = params.commandeId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reference, tauxTVA, lignes } = body

    // Vérifier que la commande existe
    const commande = await prisma.$queryRaw`
      SELECT * FROM commande_soustraitant
      WHERE id = ${parseInt(commandeId)}
      AND chantierId = ${chantierId}
      AND soustraitantId = ${soustraitantId}
    ` as any[]

    if (!commande || commande.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si la commande est verrouillée
    if (commande[0].estVerrouillee) {
      return NextResponse.json(
        { error: 'La commande est verrouillée et ne peut pas être modifiée' },
        { status: 400 }
      )
    }

    // Mettre à jour les lignes de commande si fournies
    if (lignes && Array.isArray(lignes)) {
      // Supprimer les lignes existantes
      await prisma.$executeRaw`
        DELETE FROM ligne_commande_soustraitant
        WHERE commandeSousTraitantId = ${parseInt(commandeId)}
      `

      // Calculer les totaux
      let sousTotal = 0
      const lignesAvecTotal = lignes.map((ligne: any, index: number) => {
        const total = ligne.prixUnitaire * ligne.quantite
        sousTotal += total
        return {
          ...ligne,
          ordre: index + 1,
          total
        }
      })

      const tvaValue = tauxTVA || commande[0].tauxTVA
      const tva = sousTotal * tvaValue / 100
      const total = sousTotal + tva

      // Créer les nouvelles lignes
      for (const ligne of lignesAvecTotal) {
        await prisma.$executeRaw`
          INSERT INTO ligne_commande_soustraitant (
            commandeSousTraitantId,
            ordre,
            article,
            description,
            type,
            unite,
            prixUnitaire,
            quantite,
            total,
            createdAt,
            updatedAt
          ) VALUES (
            ${parseInt(commandeId)},
            ${ligne.ordre},
            ${ligne.article},
            ${ligne.description},
            ${ligne.type || 'QP'},
            ${ligne.unite},
            ${ligne.prixUnitaire},
            ${ligne.quantite},
            ${ligne.total},
            NOW(),
            NOW()
          )
        `
      }

      // Mettre à jour la commande
      await prisma.$executeRaw`
        UPDATE commande_soustraitant
        SET 
          reference = ${reference || commande[0].reference},
          tauxTVA = ${tvaValue},
          sousTotal = ${sousTotal},
          tva = ${tva},
          total = ${total},
          updatedAt = NOW()
        WHERE id = ${parseInt(commandeId)}
      `
    } else {
      // Mettre à jour uniquement les champs de base de la commande
      // Récupérer d'abord le sous-total actuel
      const commandeActuelle = await prisma.$queryRaw`
        SELECT sousTotal FROM commande_soustraitant
        WHERE id = ${parseInt(commandeId)}
      ` as any[]
      
      const sousTotal = commandeActuelle[0].sousTotal;
      
      // Calculer la nouvelle TVA et le nouveau total
      const nouveauTauxTVA = tauxTVA || commande[0].tauxTVA;
      const nouvelleTVA = sousTotal * nouveauTauxTVA / 100;
      const nouveauTotal = sousTotal + nouvelleTVA;
      
      await prisma.$executeRaw`
        UPDATE commande_soustraitant
        SET 
          reference = ${reference || commande[0].reference},
          tauxTVA = ${nouveauTauxTVA},
          tva = ${nouvelleTVA},
          total = ${nouveauTotal},
          updatedAt = NOW()
        WHERE id = ${parseInt(commandeId)}
      `
    }

    // Récupérer la commande mise à jour
    const commandeMiseAJour = await prisma.$queryRaw`
      SELECT 
        c.*,
        ch.nomChantier,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail
      FROM commande_soustraitant c
      JOIN chantier ch ON c.chantierId = ch.chantierId
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.id = ${parseInt(commandeId)}
    ` as any[]

    // Récupérer les lignes de commande
    const lignesCommande = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(commandeId)}
      ORDER BY ordre ASC
    ` as any[]

    return NextResponse.json({
      ...commandeMiseAJour[0],
      lignes: lignesCommande
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande sous-traitant' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    const soustraitantId = params.soustraitantId;
    const commandeId = params.commandeId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que la commande existe
    const commande = await prisma.$queryRaw`
      SELECT * FROM commande_soustraitant
      WHERE id = ${parseInt(commandeId)}
      AND chantierId = ${chantierId}
      AND soustraitantId = ${soustraitantId}
    ` as any[]

    if (!commande || commande.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si la commande est verrouillée
    if (commande[0].estVerrouillee) {
      return NextResponse.json(
        { error: 'La commande est verrouillée et ne peut pas être supprimée' },
        { status: 400 }
      )
    }

    // Supprimer les lignes de commande
    await prisma.$executeRaw`
      DELETE FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(commandeId)}
    `

    // Supprimer la commande
    await prisma.$executeRaw`
      DELETE FROM commande_soustraitant
      WHERE id = ${parseInt(commandeId)}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la commande sous-traitant' },
      { status: 500 }
    )
  }
} 