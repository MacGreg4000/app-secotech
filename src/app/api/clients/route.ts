import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/clients - Récupère tous les clients
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour accéder à cette ressource' },
        { status: 401 }
      )
    }

    // Test de connexion à la base de données
    try {
      await prisma.$connect()
      console.log('Connexion à la base de données réussie')
    } catch (dbError) {
      console.error('Erreur de connexion à la base de données:', dbError)
      throw new Error('Erreur de connexion à la base de données')
    }

    // Test de la table Client
    try {
      const count = await prisma.client.count()
      console.log('Nombre de clients dans la base:', count)
    } catch (tableError) {
      console.error('Erreur avec la table Client:', tableError)
      throw new Error('Erreur avec la table Client')
    }

    const clients = await prisma.client.findMany({
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        adresse: true
      },
      orderBy: {
        nom: 'asc'
      }
    })

    console.log('Clients récupérés:', clients)

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Erreur détaillée:', error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    } : error)

    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des clients',
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : 'UnknownError'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/clients - Crée un nouveau client
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour créer un client' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Données reçues pour la création du client:', body)

    // Validation des données du client
    if (!body.nom) {
      return NextResponse.json(
        { error: 'Le nom du client est requis' },
        { status: 400 }
      )
    }

    // Générer un ID unique pour le client
    const uniqueId = `CL-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    console.log('ID généré pour le client:', uniqueId)

    // Création du client
    const client = await prisma.client.create({
      data: {
        id: uniqueId,
        nom: body.nom,
        email: body.email || null,
        telephone: body.telephone || null,
        adresse: body.adresse || null,
        updatedAt: new Date() // Ajouter la date de mise à jour
      }
    })

    console.log('Client créé avec succès:', client)
    return NextResponse.json(client)
  } catch (e) {
    console.error('Erreur lors de la création du client:', e)
    
    return NextResponse.json(
      { error: 'Erreur lors de la création du client' },
      { status: 500 }
    )
  }
} 