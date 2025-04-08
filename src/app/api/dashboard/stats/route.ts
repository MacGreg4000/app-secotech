import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/stats - Récupère les statistiques pour le dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le nombre de chantiers en préparation
    const chantiersPreperation = await prisma.chantier.count({
      where: {
        statut: 'En préparation'
      }
    })

    // Récupérer le nombre de chantiers en cours
    const chantiersEnCours = await prisma.chantier.count({
      where: {
        statut: 'En cours'
      }
    })

    // Récupérer le nombre de chantiers actifs (en préparation + en cours)
    const chantiersActifs = await prisma.chantier.count({
      where: {
        statut: {
          in: ['En préparation', 'En cours']
        }
      }
    })

    // Récupérer tous les chantiers pour calculer le budget total
    const chantiers = await prisma.chantier.findMany({
      select: {
        budget: true
      }
    })

    // Calculer le chiffre d'affaires total basé sur le budget des chantiers
    const chiffreAffairesTotal = chantiers.reduce((sum, chantier) => 
      sum + (chantier.budget || 0), 0)

    // Valeur par défaut pour le taux de complétion et la marge
    const tauxCompletionMoyen = 0;
    const margeGlobale = 0;

    return NextResponse.json({
      // Métriques financières
      chiffreAffairesTotal: chiffreAffairesTotal || 0,
      
      // Métriques chantiers
      nombreChantiersActifs: chantiersActifs,
      tauxCompletionMoyen: parseFloat(tauxCompletionMoyen.toFixed(1)),
      montantChantiersPreperation: chantiersPreperation,
      montantChantiersEnCours: chantiersEnCours
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
} 