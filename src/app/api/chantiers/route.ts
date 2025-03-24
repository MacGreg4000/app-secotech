import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    const chantiers = await prisma.chantier.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        chantierId: true,
        nomChantier: true,
        dateCommencement: true,
        etatChantier: true,
        clientNom: true,
        clientEmail: true,
        clientAdresse: true,
        adresseChantier: true,
        latitude: true,
        longitude: true,
        montantTotal: true,
        dureeEnJours: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!Array.isArray(chantiers)) {
      console.error('Prisma n\'a pas retourné un tableau:', chantiers)
      return NextResponse.json([])
    }

    return NextResponse.json(chantiers)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    )
  }
}

// POST /api/chantiers - Crée un nouveau chantier
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Générer un chantierId unique basé sur l'année et un identifiant aléatoire
    const currentYear = new Date().getFullYear()
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const chantierId = `CH-${currentYear}-${randomId}`

    const chantier = await prisma.chantier.create({
      data: {
        chantierId: chantierId,
        nomChantier: body.nomChantier,
        dateCommencement: new Date(body.dateCommencement),
        etatChantier: body.etatChantier,
        clientNom: body.clientNom,
        clientEmail: body.clientEmail,
        clientAdresse: body.clientAdresse,
        adresseChantier: body.adresseChantier,
        dureeEnJours: body.dureeEnJours ? parseInt(body.dureeEnJours) : null,
        montantTotal: 0,
        clientId: body.clientId || null,
        updatedAt: new Date()
      }
    })

    // Générer automatiquement le PPSS pour le nouveau chantier
    try {
      // Appel à l'API pour générer le PPSS
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
      const ppssResponse = await fetch(`${baseUrl}/api/chantiers/${chantierId}/generer-ppss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Transmettre les cookies pour l'authentification
          'Cookie': request.headers.get('cookie') || ''
        }
      })
      
      if (!ppssResponse.ok) {
        console.error('Erreur lors de la génération du PPSS:', await ppssResponse.text())
        // Ne pas bloquer la création du chantier si la génération du PPSS échoue
      }
    } catch (ppssError) {
      console.error('Erreur lors de la génération du PPSS:', ppssError)
      // Ne pas bloquer la création du chantier si la génération du PPSS échoue
    }

    return NextResponse.json(chantier)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du chantier' },
      { status: 500 }
    )
  }
} 