import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/chantiers - Récupère les chantiers récents pour le dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log('Récupération des chantiers pour le dashboard...')

    // Récupérer tous les chantiers avec la relation client, les dépenses et les états d'avancement
    const chantiers = await prisma.chantier.findMany({
      include: {
        client: true,
        depenses: true,
        etatsAvancement: {
          include: {
            lignes: true
          }
        },
        marche: {
          include: {
            lignemarche: true
          }
        }
      }
    })

    console.log('Chantiers récupérés:', JSON.stringify(chantiers, null, 2))

    // Calculer la progression et la marge pour chaque chantier
    const chantiersAvecProgression = chantiers.map(chantier => {
      // Calculer la progression basée sur les montants des états d'avancement
      let progression = 0
      
      if (chantier.montantTotal > 0) {
        // Calculer le montant total des états d'avancement
        const montantEtatsAvancement = chantier.etatsAvancement.reduce((total, etat) => {
          // Calculer le montant de cet état d'avancement
          const montantEtat = etat.lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0)
          return total + montantEtat
        }, 0)
        
        // Calculer la progression en pourcentage
        progression = Math.round((montantEtatsAvancement / chantier.montantTotal) * 100)
        
        // Limiter à 100% maximum
        progression = Math.min(progression, 100)
      } else if (chantier.etatChantier === 'Terminé') {
        // Si le chantier est marqué comme terminé mais n'a pas de montant, on met 100%
        progression = 100
      }
      
      // Calculer la marge (recettes vs dépenses)
      const totalDepenses = chantier.depenses.reduce((sum, depense) => sum + depense.montant, 0)
      const marge = chantier.montantTotal > 0 
        ? Math.round(((chantier.montantTotal - totalDepenses) / chantier.montantTotal) * 100) 
        : 0
      
      // Déterminer le nom du client (priorité à la relation client, puis au champ clientNom)
      const nomClient = chantier.client?.nom || chantier.clientNom || 'Client non spécifié';
      
      const result = {
        id: chantier.chantierId,
        nom: chantier.nomChantier,
        client: nomClient,
        etat: chantier.etatChantier,
        montant: chantier.montantTotal,
        dateCommencement: chantier.dateCommencement,
        createdAt: chantier.createdAt,
        progression,
        marge,
        latitude: chantier.latitude,
        longitude: chantier.longitude,
        adresse: chantier.adresseChantier
      }
      
      return result
    })

    return NextResponse.json(chantiersAvecProgression)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    )
  }
} 