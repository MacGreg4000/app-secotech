import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// Récupérer les notes d'un utilisateur
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const userId = params.userId;

    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur demande ses propres notes
    // ou qu'il a les droits d'administration
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    
    // Récupérer les notes de l'utilisateur avec une requête SQL brute
    const userNotesResults = await prisma.$queryRaw`
      SELECT content, updatedAt FROM user_notes 
      WHERE userId = ${userId}
    `
    
    // Convertir le résultat en un tableau
    const userNotesArray = userNotesResults as { content: string; updatedAt: Date }[]
    
    // Si aucun résultat, renvoyer un contenu vide
    if (!userNotesArray.length) {
      return NextResponse.json({ content: '', updatedAt: null })
    }
    
    // Sinon, renvoyer le premier résultat
    const userNotes = userNotesArray[0]

    return NextResponse.json({
      content: userNotes.content,
      updatedAt: userNotes.updatedAt,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notes' },
      { status: 500 }
    )
  }
}

// Mettre à jour les notes d'un utilisateur
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const userId = params.userId;

    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur modifie ses propres notes
    // ou qu'il a les droits d'administration
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer le contenu des notes depuis la requête
    const { content } = await request.json()
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Format de contenu invalide' },
        { status: 400 }
      )
    }

    // Vérifier si les notes existent déjà
    const existingNotesResults = await prisma.$queryRaw`
      SELECT id FROM user_notes WHERE userId = ${userId}
    `
    const existingNotesArray = existingNotesResults as { id: number }[]
    const now = new Date()
    
    // Si les notes existent, les mettre à jour
    if (existingNotesArray.length) {
      await prisma.$executeRaw`
        UPDATE user_notes 
        SET content = ${content}, updatedAt = ${now}
        WHERE userId = ${userId}
      `
    } else {
      // Sinon, créer de nouvelles notes
      await prisma.$executeRaw`
        INSERT INTO user_notes (userId, content, createdAt, updatedAt)
        VALUES (${userId}, ${content}, ${now}, ${now})
      `
    }
    
    // Récupérer les notes mises à jour
    const updatedNotesResults = await prisma.$queryRaw`
      SELECT content, updatedAt FROM user_notes 
      WHERE userId = ${userId}
    `
    const updatedNotesArray = updatedNotesResults as { content: string; updatedAt: Date }[]
    const userNotes = updatedNotesArray[0]

    return NextResponse.json({
      content: userNotes.content,
      updatedAt: userNotes.updatedAt,
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notes' },
      { status: 500 }
    )
  }
} 