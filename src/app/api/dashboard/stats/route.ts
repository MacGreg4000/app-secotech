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

    // Récupérer le montant des chantiers en préparation
    const chantiersPreperation = await prisma.chantier.aggregate({
      where: {
        etatChantier: 'En préparation'
      },
      _sum: {
        montantTotal: true
      }
    })

    // Récupérer le montant des chantiers en cours
    const chantiersEnCours = await prisma.chantier.aggregate({
      where: {
        etatChantier: 'En cours'
      },
      _sum: {
        montantTotal: true
      }
    })

    // Récupérer le nombre de chantiers actifs (en préparation + en cours)
    const chantiersActifs = await prisma.chantier.count({
      where: {
        etatChantier: {
          in: ['En préparation', 'En cours']
        }
      }
    })

    // Récupérer le chiffre d'affaires total (tous chantiers)
    const chiffreAffaires = await prisma.chantier.aggregate({
      _sum: {
        montantTotal: true
      }
    })

    // Valeur par défaut pour le taux de complétion et la marge
    const tauxCompletionMoyen = 0;
    const margeGlobale = 0;

    return NextResponse.json({
      // Métriques financières
      chiffreAffairesTotal: chiffreAffaires._sum.montantTotal || 0,
      
      // Métriques chantiers
      nombreChantiersActifs: chantiersActifs,
      tauxCompletionMoyen: parseFloat(tauxCompletionMoyen.toFixed(1)),
      montantChantiersPreperation: chantiersPreperation._sum.montantTotal || 0,
      montantChantiersEnCours: chantiersEnCours._sum.montantTotal || 0
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
} 