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

    console.log('Calcul des statistiques du dashboard...')

    // Récupérer tous les chantiers
    const tousLesChantiers = await prisma.chantier.findMany({
      select: {
        chantierId: true,
        budget: true,
        statut: true,
        createdAt: true
      }
    })

    console.log(`Statuts trouvés dans la base: ${[...new Set(tousLesChantiers.map(c => c.statut))].join(', ')}`)

    // Obtenir l'année civile actuelle
    const anneeActuelle = new Date().getFullYear();
    const debutAnnee = new Date(anneeActuelle, 0, 1); // 1er janvier
    const finAnnee = new Date(anneeActuelle, 11, 31); // 31 décembre

    // Récupérer les chantiers en préparation
    const chantiersPreparation = tousLesChantiers.filter(c => 
      c.statut === 'EN_PREPARATION' || c.statut === 'En préparation' || c.statut === 'A_VENIR' || c.statut === 'À venir'
    )
    console.log(`Chantiers en préparation trouvés: ${chantiersPreparation.length}`)

    // Récupérer les chantiers en cours
    const chantiersEnCours = tousLesChantiers.filter(c => 
      c.statut === 'EN_COURS' || c.statut === 'En cours'
    )
    console.log(`Chantiers en cours trouvés: ${chantiersEnCours.length}`)

    // Compter les chantiers actifs (en préparation + en cours)
    const chantiersActifs = tousLesChantiers.filter(c => 
      c.statut === 'EN_PREPARATION' || c.statut === 'En préparation' || 
      c.statut === 'EN_COURS' || c.statut === 'En cours' ||
      c.statut === 'A_VENIR' || c.statut === 'À venir'
    )
    const nombreChantiersActifs = chantiersActifs.length
    console.log(`Nombre total de chantiers actifs: ${nombreChantiersActifs}`)

    // Récupérer tous les chantiers créés cette année
    const chantiersAnnee = tousLesChantiers.filter(c => {
      if (!c.createdAt) return false;
      const createdAt = new Date(c.createdAt);
      return createdAt >= debutAnnee && createdAt <= finAnnee;
    })
    console.log(`Chantiers créés cette année: ${chantiersAnnee.length}`)

    // Calculer le montant total des chantiers en préparation
    const montantChantiersPreperation = chantiersPreparation.reduce((sum, chantier) => 
      sum + (chantier.budget || 0), 0)

    // Calculer le montant total des chantiers en cours
    const montantChantiersEnCours = chantiersEnCours.reduce((sum, chantier) => 
      sum + (chantier.budget || 0), 0)

    // Calculer le chiffre d'affaires total basé sur le budget de tous les chantiers
    const chiffreAffairesTotal = tousLesChantiers.reduce((sum, chantier) => 
      sum + (chantier.budget || 0), 0)

    console.log(`Stats calculées: ${nombreChantiersActifs} chantiers actifs, ${chiffreAffairesTotal}€ CA total`)
    console.log(`Montant en préparation: ${montantChantiersPreperation}€, Montant en cours: ${montantChantiersEnCours}€`)

    return NextResponse.json({
      // Métriques financières
      chiffreAffairesTotal: chiffreAffairesTotal || 0,
      
      // Métriques chantiers
      nombreChantiersActifs: nombreChantiersActifs,
      montantChantiersPreperation: montantChantiersPreperation || 0,
      montantChantiersEnCours: montantChantiersEnCours || 0
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}