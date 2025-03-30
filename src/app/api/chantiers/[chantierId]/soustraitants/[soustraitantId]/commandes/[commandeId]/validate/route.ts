import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
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

    // Vérifier si la commande est déjà verrouillée
    if (commande[0].estVerrouillee) {
      return NextResponse.json(
        { error: 'La commande est déjà verrouillée' },
        { status: 400 }
      )
    }

    // Vérifier que la commande a des lignes
    const lignes = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(commandeId)}
    ` as any[]

    if (!lignes || lignes.length === 0 || lignes[0].count === 0) {
      return NextResponse.json(
        { error: 'La commande ne contient aucune ligne' },
        { status: 400 }
      )
    }

    // Verrouiller la commande
    await prisma.$executeRaw`
      UPDATE commande_soustraitant
      SET 
        estVerrouillee = true,
        statut = 'VALIDEE',
        updatedAt = NOW()
      WHERE id = ${parseInt(commandeId)}
    `

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

    return NextResponse.json(commandeMiseAJour[0])
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la validation de la commande sous-traitant' },
      { status: 500 }
    )
  }
} 