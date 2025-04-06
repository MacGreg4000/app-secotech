import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/chantiers - Récupère les chantiers en cours pour la carte du dashboard
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

    // Récupérer tous les chantiers en cours
    const chantiers = await prisma.chantier.findMany({
      where: {
        // Retirer le filtre pour récupérer tous les chantiers
      }
    })

    console.log(`Chantiers récupérés: ${chantiers.length}`)
    
    // Log des chantiers avec coordonnées
    const chantiersAvecCoords = chantiers.filter(c => c.latitude && c.longitude)
    console.log(`Chantiers avec coordonnées: ${chantiersAvecCoords.length}`)
    console.log('Coordonnées des chantiers:', chantiersAvecCoords.map(c => ({
      nom: c.nomChantier,
      lat: c.latitude,
      lon: c.longitude
    })))

    // Formater les données pour la carte
    const chantiersFormatted = chantiers.map(chantier => {
      // Attribuer une progression selon l'état du chantier
      let progression = 0;
      
      if (chantier.etatChantier === "En préparation") {
        progression = 25;
      } else if (chantier.etatChantier === "En cours") {
        progression = 50;
      } else if (chantier.etatChantier === "Terminé") {
        progression = 100;
      }
      
      return {
        id: chantier.chantierId,
        nom: chantier.nomChantier,
        client: chantier.clientNom || 'Client non spécifié',
        etat: chantier.etatChantier,
        montant: chantier.montantTotal,
        dateCommencement: chantier.dateCommencement,
        createdAt: chantier.createdAt,
        progression,
        latitude: chantier.latitude,
        longitude: chantier.longitude,
        adresse: chantier.clientAdresse,
        adresseChantier: chantier.adresseChantier
      }
    });

    console.log(`Données formatées pour ${chantiersFormatted.length} chantiers`);
    
    return NextResponse.json(chantiersFormatted)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    )
  }
} 