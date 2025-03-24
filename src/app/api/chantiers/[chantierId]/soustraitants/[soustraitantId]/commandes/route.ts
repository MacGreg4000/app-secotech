import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { chantierId: string; soustraitantId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Utiliser une requête SQL brute pour récupérer les commandes sous-traitant
    const commandes = await prisma.$queryRaw`
      SELECT 
        c.*,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail
      FROM commande_soustraitant c
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.chantierId = ${params.chantierId}
      AND c.soustraitantId = ${params.soustraitantId}
      ORDER BY c.dateCommande DESC
    ` as any[]

    // Pour chaque commande, récupérer ses lignes
    const commandesAvecLignes = await Promise.all(commandes.map(async (commande: any) => {
      const lignes = await prisma.$queryRaw`
        SELECT * FROM ligne_commande_soustraitant
        WHERE commandeSousTraitantId = ${commande.id}
        ORDER BY ordre ASC
      ` as any[]

      return {
        ...commande,
        lignes: lignes
      }
    }))

    return NextResponse.json(commandesAvecLignes)
  } catch (error) {
    console.error('Erreur dans GET /commandes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes sous-traitant' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { chantierId: string; soustraitantId: string } }
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
    const { lignes, reference, tauxTVA } = body

    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json(
        { error: 'Les lignes de commande sont requises' },
        { status: 400 }
      )
    }

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

    const tva = sousTotal * (tauxTVA || 0) / 100
    const total = sousTotal + tva

    // Créer la commande avec une requête SQL brute
    const result = await prisma.$executeRaw`
      INSERT INTO commande_soustraitant (
        chantierId, 
        soustraitantId, 
        dateCommande, 
        reference, 
        tauxTVA, 
        sousTotal, 
        tva, 
        total, 
        statut, 
        estVerrouillee, 
        createdAt, 
        updatedAt
      ) VALUES (
        ${params.chantierId},
        ${params.soustraitantId},
        NOW(),
        ${reference || null},
        ${tauxTVA || 0},
        ${sousTotal},
        ${tva},
        ${total},
        'BROUILLON',
        false,
        NOW(),
        NOW()
      )
    `

    // Récupérer l'ID de la commande créée
    const commandeCreee = await prisma.$queryRaw`
      SELECT id FROM commande_soustraitant 
      WHERE chantierId = ${params.chantierId} 
      AND soustraitantId = ${params.soustraitantId}
      ORDER BY id DESC LIMIT 1
    ` as any[]

    if (!commandeCreee || commandeCreee.length === 0) {
      return NextResponse.json(
        { error: 'Erreur lors de la création de la commande' },
        { status: 500 }
      )
    }

    const commandeId = commandeCreee[0].id

    // Créer les lignes de commande
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
          ${commandeId},
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

    // Récupérer la commande complète
    const commande = await prisma.$queryRaw`
      SELECT 
        c.*,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail
      FROM commande_soustraitant c
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.id = ${commandeId}
    ` as any[]

    // Récupérer les lignes de la commande
    const lignesCommande = await prisma.$queryRaw`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${commandeId}
      ORDER BY ordre ASC
    ` as any[]

    return NextResponse.json({
      ...commande[0],
      lignes: lignesCommande
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande sous-traitant' },
      { status: 500 }
    )
  }
} 