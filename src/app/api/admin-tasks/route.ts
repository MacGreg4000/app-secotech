import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chantierId = searchParams.get('chantierId')

    const tasks = await prisma.admintask.findMany({
      where: chantierId ? {
        chantierId: chantierId
      } : undefined,
      include: {
        chantier: {
          select: {
            nomChantier: true
          }
        },
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

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tâches' },
      { status: 500 }
    )
  }
}

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
    const task = await prisma.admintask.create({
      data: {
        title: body.title,
        taskType: body.taskType,
        chantierId: body.chantierId,
        updatedAt: new Date(),
        completed: false
      },
      include: {
        chantier: {
          select: {
            nomChantier: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la tâche' },
      { status: 500 }
    )
  }
} 