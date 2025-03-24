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

    // Récupérer les dépenses du mois en cours
    const debutMois = new Date()
    debutMois.setDate(1)
    debutMois.setHours(0, 0, 0, 0)
    
    const finMois = new Date()
    finMois.setMonth(finMois.getMonth() + 1)
    finMois.setDate(0)
    finMois.setHours(23, 59, 59, 999)
    
    const depensesMois = await prisma.depense.aggregate({
      where: {
        createdAt: {
          gte: debutMois,
          lte: finMois
        }
      },
      _sum: {
        montant: true
      }
    })

    // Calculer la marge globale basée sur les dépenses et les montants des chantiers
    const totalDepenses = await prisma.depense.aggregate({
      _sum: {
        montant: true
      }
    })
    
    // Calcul de marge réelle (éviter division par zéro)
    let margeGlobale = 0
    if (chiffreAffaires._sum.montantTotal && chiffreAffaires._sum.montantTotal > 0) {
      margeGlobale = ((chiffreAffaires._sum.montantTotal - (totalDepenses._sum.montant || 0)) / chiffreAffaires._sum.montantTotal) * 100
    }

    // Calculer le taux de complétion moyen des chantiers actifs basé sur les états d'avancement
    const chantiersAvecEtats = await prisma.chantier.findMany({
      where: {
        etatChantier: {
          in: ['En préparation', 'En cours']
        }
      },
      select: {
        chantierId: true,
        montantTotal: true,
        etatsAvancement: {
          include: {
            lignes: true
          }
        }
      }
    })
    
    // Calculer le taux de complétion moyen basé sur les montants des états d'avancement
    let tauxCompletionMoyen = 0
    let chantiersAvecProgression = 0
    
    chantiersAvecEtats.forEach(chantier => {
      if (chantier.montantTotal > 0) {
        // Calculer le montant total des états d'avancement pour ce chantier
        const montantEtatsAvancement = chantier.etatsAvancement.reduce((total, etat) => {
          const montantEtat = etat.lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0)
          return total + montantEtat
        }, 0)
        
        // Calculer le taux de complétion pour ce chantier
        const tauxCompletionChantier = Math.min((montantEtatsAvancement / chantier.montantTotal) * 100, 100)
        tauxCompletionMoyen += tauxCompletionChantier
        chantiersAvecProgression++
      }
    })
    
    // Calculer la moyenne (éviter division par zéro)
    if (chantiersAvecProgression > 0) {
      tauxCompletionMoyen = tauxCompletionMoyen / chantiersAvecProgression
    }

    // Récupérer le nombre de machines prêtées
    const machinesPretees = await prisma.machine.count({
      where: {
        statut: 'PRETE'
      }
    })

    // Récupérer le nombre total de machines
    const totalMachines = await prisma.machine.count()

    // Récupérer le nombre de documents de sous-traitants qui expirent dans les 30 prochains jours
    const dateExpiration = new Date()
    dateExpiration.setDate(dateExpiration.getDate() + 30)
    
    const documentsARenouveler = await prisma.documentouvrier.count({
      where: {
        dateExpiration: {
          lte: dateExpiration,
          gte: new Date()
        }
      }
    })

    return NextResponse.json({
      // Métriques financières
      chiffreAffairesTotal: chiffreAffaires._sum.montantTotal || 0,
      chiffreAffairesEnCours: chantiersEnCours._sum.montantTotal || 0,
      chiffreAffairesAVenir: chantiersPreperation._sum.montantTotal || 0,
      depensesMoisEnCours: depensesMois._sum.montant || 0,
      margeGlobale: parseFloat(margeGlobale.toFixed(1)),
      
      // Métriques chantiers
      nombreChantiersActifs: chantiersActifs,
      tauxCompletionMoyen: parseFloat(tauxCompletionMoyen.toFixed(1)),
      montantChantiersPreperation: chantiersPreperation._sum.montantTotal || 0,
      montantChantiersEnCours: chantiersEnCours._sum.montantTotal || 0,
      
      // Métriques ressources
      nombreMachinesPretees: machinesPretees,
      totalMachines: totalMachines,
      documentsARenouveler: documentsARenouveler
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
} 