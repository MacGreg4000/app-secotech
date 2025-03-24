import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function PUT(
  request: Request,
  { params }: { params: { chantierId: string; noteId: string } }
) {
  try {
    console.log(`Modification de la note ${params.noteId} pour le chantier ${params.chantierId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('Erreur: Utilisateur non authentifié')
      return new NextResponse('Non autorisé', { status: 401 })
    }
    
    console.log('Session utilisateur:', {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role
    })

    const { contenu } = await request.json()
    console.log('Nouveau contenu de la note:', contenu)
    
    const noteId = parseInt(params.noteId)
    if (isNaN(noteId)) {
      console.log(`Erreur: ID de note invalide: ${params.noteId}`)
      return NextResponse.json(
        { error: 'ID de note invalide' },
        { status: 400 }
      )
    }

    try {
      const note = await prisma.note.update({
        where: {
          id: noteId,
          chantierId: params.chantierId
        },
        data: {
          contenu,
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

      console.log('Note modifiée avec succès:', note)
      return NextResponse.json(note)
    } catch (prismaError: any) {
      console.error('Erreur Prisma lors de la modification de la note:', prismaError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la modification de la note dans la base de données',
          details: prismaError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erreur générale lors de la modification de la note:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la modification de la note',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { chantierId: string; noteId: string } }
) {
  try {
    console.log(`Suppression de la note ${params.noteId} pour le chantier ${params.chantierId}`)
    
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

    const noteId = parseInt(params.noteId)
    if (isNaN(noteId)) {
      console.log(`Erreur: ID de note invalide: ${params.noteId}`)
      return NextResponse.json(
        { error: 'ID de note invalide' },
        { status: 400 }
      )
    }

    // Vérifier si la note existe
    const existingNote = await prisma.note.findUnique({
      where: {
        id: noteId
      }
    })

    if (!existingNote) {
      console.log(`Erreur: Note ${noteId} non trouvée`)
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      )
    }

    if (existingNote.chantierId !== params.chantierId) {
      console.log(`Erreur: La note ${noteId} n'appartient pas au chantier ${params.chantierId}`)
      return NextResponse.json(
        { error: 'La note n\'appartient pas à ce chantier' },
        { status: 403 }
      )
    }

    try {
      await prisma.note.delete({
        where: {
          id: noteId
        }
      })

      console.log(`Note ${noteId} supprimée avec succès`)
      return NextResponse.json({ success: true })
    } catch (prismaError: any) {
      console.error('Erreur Prisma lors de la suppression de la note:', prismaError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la suppression de la note dans la base de données',
          details: prismaError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erreur générale lors de la suppression de la note:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la suppression de la note',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 