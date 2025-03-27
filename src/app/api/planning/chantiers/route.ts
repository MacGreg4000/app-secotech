import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/planning/chantiers - Récupère les chantiers pour le planning Gantt
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log('Récupération des chantiers pour le planning...')

    // Récupérer tous les chantiers avec les informations nécessaires pour le planning
    const chantiers = await prisma.chantier.findMany({
      select: {
        id: true,
        chantierId: true,
        nomChantier: true,
        etatChantier: true,
        clientNom: true,
        dateCommencement: true,
        dureeEnJours: true,
        client: {
          select: {
            nom: true
          }
        }
      },
      orderBy: {
        dateCommencement: 'asc'
      }
    })

    console.log(`${chantiers.length} chantiers récupérés pour le planning`)

    // Formater les données pour le planning Gantt
    const chantiersFormatted = chantiers.map(chantier => {
      // Déterminer le nom du client (priorité à la relation client, puis au champ clientNom)
      const nomClient = chantier.client?.nom || chantier.clientNom || 'Client non spécifié'
      
      return {
        id: chantier.chantierId,
        nom: chantier.nomChantier,
        client: nomClient,
        etat: chantier.etatChantier,
        dateCommencement: chantier.dateCommencement,
        dureeEnJours: chantier.dureeEnJours || 30 // Valeur par défaut si non spécifiée
      }
    })

    return NextResponse.json(chantiersFormatted)
  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers pour le planning:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    )
  }
} 