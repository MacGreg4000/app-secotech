import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    console.log('Récupération des notes pour le chantier:', params.chantierId)
    
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

    try {
      const notes = await prisma.note.findMany({
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      console.log(`${notes.length} notes trouvées pour le chantier ${params.chantierId}`)
      return NextResponse.json(notes)
    } catch (prismaError: any) {
      console.error('Erreur Prisma lors de la récupération des notes:', prismaError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la récupération des notes dans la base de données',
          details: prismaError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erreur générale lors de la récupération des notes:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des notes',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    console.log('Création d\'une note pour le chantier:', params.chantierId)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
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

    const body = await request.json()
    console.log('Contenu de la note:', body)
    
    // Vérifier que le contenu est présent
    if (!body.contenu) {
      console.log('Erreur: Contenu de la note manquant')
      return NextResponse.json(
        { error: 'Le contenu de la note est requis' },
        { status: 400 }
      )
    }

    try {
      const note = await prisma.note.create({
        data: {
          contenu: body.contenu,
          chantierId: params.chantierId,
          createdBy: session.user.id,
          updatedAt: new Date() // Assurez-vous que updatedAt est défini
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

      console.log('Note créée avec succès:', note)
      return NextResponse.json(note)
    } catch (prismaError: any) {
      console.error('Erreur Prisma lors de la création de la note:', prismaError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la création de la note dans la base de données',
          details: prismaError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erreur générale lors de la création de la note:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de la note',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 