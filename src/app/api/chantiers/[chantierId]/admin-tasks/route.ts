import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    console.log('Récupération des tâches pour le chantier:', params.chantierId)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    console.log('Session utilisateur:', {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role
    })

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: params.chantierId
      }
    })

    if (!chantier) {
      console.log(`Erreur: Chantier ${params.chantierId} non trouvé`)
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    console.log('Recherche des tâches pour le chantier:', params.chantierId)

    try {
      const tasks = await prisma.admintask.findMany({
        where: {
          chantierId: params.chantierId
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      console.log('Tâches trouvées:', tasks)

      return NextResponse.json(tasks)
    } catch (prismaError: any) {
      console.error('Erreur Prisma:', prismaError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la récupération des tâches dans la base de données',
          details: prismaError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erreur générale:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des tâches',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 