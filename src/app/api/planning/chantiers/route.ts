import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/planning/chantiers - Récupère les chantiers pour le planning Gantt
export async function GET() {
  try {
    const chantiers = await prisma.chantier.findMany({
      select: {
        chantierId: true,
        nomChantier: true,
        dateCommencement: true,
        dureeEnJours: true,
        clientNom: true,
        etatChantier: true
      },
      orderBy: {
        dateCommencement: 'asc'
      }
    })

    console.log('Données brutes reçues:', chantiers)

    const formattedChantiers = chantiers.map(chantier => {
      const startDate = new Date(chantier.dateCommencement)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + (chantier.dureeEnJours || 30))

      console.log(`Chantier ${chantier.chantierId}:`, {
        dateCommencement: startDate.toISOString(),
        dureeEnJours: chantier.dureeEnJours || 30,
        endDate: endDate.toISOString()
      })

      return {
        id: chantier.chantierId,
        title: chantier.nomChantier,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        client: chantier.clientNom,
        etat: chantier.etatChantier
      }
    })

    console.log('Données formatées:', formattedChantiers)

    return NextResponse.json(formattedChantiers)
  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    )
  }
} 