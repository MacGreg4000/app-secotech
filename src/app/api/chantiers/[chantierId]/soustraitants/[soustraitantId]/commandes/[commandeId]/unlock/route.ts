import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: { chantierId: string; soustraitantId: string; commandeId: string } }
) {
  try {
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

    // Vérifier si la commande est verrouillée
    if (!commande[0].estVerrouillee) {
      return NextResponse.json(
        { error: 'La commande n\'est pas verrouillée' },
        { status: 400 }
      )
    }

    // Déverrouiller la commande
    await prisma.$executeRaw`
      UPDATE commande_soustraitant
      SET 
        estVerrouillee = false,
        statut = 'BROUILLON',
        updatedAt = NOW()
      WHERE id = ${parseInt(params.commandeId)}
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
      WHERE c.id = ${parseInt(params.commandeId)}
    ` as any[]

    return NextResponse.json(commandeMiseAJour[0])
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors du déverrouillage de la commande sous-traitant' },
      { status: 500 }
    )
  }
} 