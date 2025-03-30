import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { id } = (await context.params)

    // Vérifier si le sous-traitant existe
    const sousTraitant = await prisma.soustraitant.findUnique({
      where: { id }
    })

    if (!sousTraitant) {
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le sous-traitant et tous ses ouvriers (cascade delete)
    await prisma.soustraitant.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du sous-traitant' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { id } = (await context.params)

    console.log('Récupération du sous-traitant avec ID:', id);

    const sousTraitant = await prisma.soustraitant.findUnique({
      where: { id },
      include: {
        ouvrier: {
          include: {
            _count: {
              select: { documentouvrier: true }
            }
          }
        }
      }
    })

    if (!sousTraitant) {
      console.log('Sous-traitant non trouvé avec ID:', id);
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    console.log('Données du sous-traitant récupérées:', JSON.stringify(sousTraitant, null, 2));
    return NextResponse.json(sousTraitant)
  } catch (error) {
    console.error('Erreur lors de la récupération du sous-traitant:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du sous-traitant' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { id } = (await context.params)
    const body = await request.json()

    // Validation basique
    if (!body.nom || !body.email) {
      return NextResponse.json(
        { error: 'Le nom et l\'email sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'email est déjà utilisé par un autre sous-traitant
    const existingTraitant = await prisma.soustraitant.findFirst({
      where: {
        email: body.email,
        NOT: {
          id
        }
      }
    })

    if (existingTraitant) {
      return NextResponse.json(
        { error: 'Un autre sous-traitant utilise déjà cet email' },
        { status: 400 }
      )
    }

    const sousTraitant = await prisma.soustraitant.update({
      where: { id },
      data: {
        nom: body.nom,
        email: body.email,
        contact: body.contact || null,
        telephone: body.telephone || null,
        adresse: body.adresse || null,
        ...(body.tva !== undefined ? { tva: body.tva || null } : {}),
        updatedAt: new Date()
      } as any
    })

    return NextResponse.json(sousTraitant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du sous-traitant' },
      { status: 500 }
    )
  }
} 