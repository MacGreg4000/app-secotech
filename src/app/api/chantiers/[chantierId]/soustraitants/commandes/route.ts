import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer toutes les commandes sous-traitant pour ce chantier
    const commandes = await prisma.$queryRaw`
      SELECT 
        c.*,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail
      FROM commande_soustraitant c
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.chantierId = ${params.chantierId}
      ORDER BY c.dateCommande DESC
    ` as any[]

    return NextResponse.json(commandes)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes sous-traitant' },
      { status: 500 }
    )
  }
} 