import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET - Récupérer les paramètres
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const settings = await prisma.companysettings.findFirst()
    return NextResponse.json(settings || {})
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour les paramètres
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const data = await request.json()
    
    // Chercher d'abord le premier enregistrement existant
    const existingSettings = await prisma.companysettings.findFirst()
    
    // Préparer les données avec des valeurs par défaut pour les champs manquants
    const settingsData = {
      id: 'COMPANY_SETTINGS',
      name: data.name || '',
      address: data.address || '',
      zipCode: data.zipCode || '',
      city: data.city || '',
      phone: data.phone || '',
      email: data.email || '',
      iban: data.iban || '',
      tva: data.tva || '',
      logo: data.logo || '',
      updatedAt: new Date(),
      // Paramètres d'email
      emailHost: data.emailHost || '',
      emailPort: data.emailPort || '',
      emailSecure: data.emailSecure || false,
      emailUser: data.emailUser || '',
      emailPassword: data.emailPassword || '',
      emailFrom: data.emailFrom || '',
      emailFromName: data.emailFromName || ''
    }
    
    const settings = await prisma.companysettings.upsert({
      where: { id: existingSettings?.id || 'COMPANY_SETTINGS' },
      update: settingsData,
      create: settingsData
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    )
  }
} 