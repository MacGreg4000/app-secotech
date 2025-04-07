import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// GET /api/chantiers - Liste tous les chantiers
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Utiliser $queryRaw pour éviter les erreurs TypeScript
    const chantiers = await prisma.$queryRaw`
      SELECT c.*, 
             cl.nom as clientNom, 
             cl.email as clientEmail, 
             cl.adresse as clientAdresse
      FROM Chantier c
      LEFT JOIN Client cl ON c.clientId = cl.id
      ORDER BY c.createdAt DESC
    `;

    if (!Array.isArray(chantiers)) {
      console.error('Prisma n\'a pas retourné un tableau:', chantiers)
      return NextResponse.json([])
    }

    // Transformer les données pour compatibilité avec l'interface existante
    const formattedChantiers = chantiers.map((chantier: any) => {
      // Conversion des états pour l'interface utilisateur
      let etatChantier = 'En préparation'
      if (chantier.statut === 'EN_COURS') etatChantier = 'En cours'
      else if (chantier.statut === 'TERMINE') etatChantier = 'Terminé'
      else if (chantier.statut === 'A_VENIR') etatChantier = 'À venir'

      return {
        id: chantier.id,
        chantierId: chantier.chantierId,
        nomChantier: chantier.nomChantier,
        dateCommencement: chantier.dateDebut,
        etatChantier,
        clientNom: chantier.clientNom || '',
        clientEmail: chantier.clientEmail || '',
        clientAdresse: chantier.clientAdresse || '',
        adresseChantier: chantier.adresseChantier || '',
        villeChantier: chantier.villeChantier || '',
        montantTotal: chantier.budget || 0,
        dureeEnJours: chantier.dateFinPrevue && chantier.dateDebut 
          ? Math.ceil((new Date(chantier.dateFinPrevue).getTime() - new Date(chantier.dateDebut).getTime()) / (1000 * 3600 * 24)) 
          : null,
        createdAt: chantier.createdAt,
        updatedAt: chantier.updatedAt
      }
    })

    return NextResponse.json(formattedChantiers)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    )
  }
}

// Fonction pour générer une chaîne aléatoire
function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// POST /api/chantiers - Créer un nouveau chantier
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      nomChantier, 
      dateCommencement, 
      etatChantier, 
      adresseChantier, 
      dureeEnJours, 
      typeDuree,
      clientId, 
      clientNom, 
      clientEmail, 
      clientAdresse 
    } = body

    // Génération d'un ID unique pour le chantier
    const year = new Date().getFullYear()
    const randomId = generateRandomString(6).toUpperCase()
    const chantierId = `CH-${year}-${randomId}`

    // Conversion des états pour correspondre au schéma prisma
    let statut = 'A_VENIR'
    if (etatChantier === 'En cours') statut = 'EN_COURS'
    else if (etatChantier === 'Terminé') statut = 'TERMINE'
    else if (etatChantier === 'En préparation') statut = 'EN_PREPARATION'

    // Création du chantier en utilisant une approche non typée
    const chantierData = {
      chantierId,
      nomChantier,
      dateDebut: dateCommencement ? new Date(dateCommencement) : null,
      statut,
      adresseChantier,
      dureeEnJours: dureeEnJours ? parseInt(dureeEnJours) : null,
      typeDuree: typeDuree || 'CALENDRIER',
      clientId,
      updatedAt: new Date(),
      createdAt: new Date()
    };

    // Utiliser $executeRaw ou $queryRaw pour éviter les problèmes de typage
    const insertResult = await prisma.$executeRawUnsafe(`
      INSERT INTO Chantier (
        chantierId, nomChantier, dateDebut, statut, adresseChantier, 
        dureeEnJours, typeDuree, clientId, updatedAt, createdAt
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `, 
      chantierId, 
      nomChantier, 
      dateCommencement ? new Date(dateCommencement) : null, 
      statut, 
      adresseChantier,
      dureeEnJours ? parseInt(dureeEnJours) : null,

      typeDuree || 'CALENDRIER', 
      clientId, 
      new Date(), 
      new Date()
    );
    
    // Récupérer le chantier créé
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    });

    return NextResponse.json(chantier)
  } catch (error) {
    console.error('Erreur lors de la création du chantier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du chantier' },
      { status: 500 }
    )
  }
} 