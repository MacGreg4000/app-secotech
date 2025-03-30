import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; taskType: string }> }
) {
  const params = await props.params;
  try {
    console.log(`Mise à jour de la tâche ${params.taskType} pour le chantier ${params.chantierId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
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

    // Récupérer la tâche existante
    const existingTask = await prisma.admintask.findUnique({
      where: {
        chantierId_taskType: {
          chantierId: params.chantierId,
          taskType: params.taskType
        }
      }
    })
    
    console.log('Tâche existante:', existingTask)

    const taskTitles: { [key: string]: string } = {
      'declaration_chantier': 'Déclaration de chantier',
      'cautionnement_collectif': 'Cautionnement collectif',
      'declaration_sous_traitance': 'Déclaration de sous-traitance',
      'fiche_technique': 'Fiche technique'
    }

    // Basculer l'état completed
    const newCompleted = !existingTask?.completed
    console.log(`Nouvel état de la tâche: ${newCompleted ? 'Complété' : 'Non complété'}`)

    try {
      const task = await prisma.admintask.upsert({
        where: {
          chantierId_taskType: {
            chantierId: params.chantierId,
            taskType: params.taskType
          }
        },
        update: {
          completed: newCompleted,
          completedAt: newCompleted ? new Date() : null,
          completedBy: newCompleted ? session.user.id : null,
          updatedAt: new Date() // Assurez-vous que updatedAt est défini
        },
        create: {
          chantierId: params.chantierId,
          taskType: params.taskType,
          title: taskTitles[params.taskType] || params.taskType,
          completed: true,
          completedAt: new Date(),
          completedBy: session.user.id,
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
      
      console.log('Tâche mise à jour avec succès:', task)
      return NextResponse.json(task)
    } catch (prismaError: any) {
      console.error('Erreur Prisma:', prismaError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la mise à jour de la tâche dans la base de données',
          details: prismaError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erreur générale:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour de la tâche',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 