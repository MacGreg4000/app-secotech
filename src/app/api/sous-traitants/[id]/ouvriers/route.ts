import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    console.log('Récupération des ouvriers pour le sous-traitant ID:', id);

    const ouvriers = await prisma.ouvrier.findMany({
      where: { 
        sousTraitantId: id 
      },
      include: {
        _count: {
          select: { documentouvrier: true }
        }
      },
      orderBy: {
        nom: 'asc'
      }
    })

    console.log(`${ouvriers.length} ouvriers trouvés pour le sous-traitant ID: ${id}`);
    return NextResponse.json(ouvriers)
  } catch (error) {
    console.error('Erreur lors de la récupération des ouvriers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ouvriers' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    console.log('Données reçues pour la création de l\'ouvrier:', body);
    console.log('ID du sous-traitant:', id);

    // Validation basique
    if (!body.nom || !body.prenom || !body.dateEntree || !body.poste) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Vérifier si le sous-traitant existe
    const sousTraitant = await prisma.soustraitant.findUnique({
      where: { id }
    })

    if (!sousTraitant) {
      console.log('Sous-traitant non trouvé avec ID:', id);
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Générer un ID unique pour l'ouvrier
    const uniqueId = `OUV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    console.log('ID généré pour l\'ouvrier:', uniqueId);

    const ouvrier = await prisma.ouvrier.create({
      data: {
        id: uniqueId,
        nom: body.nom,
        prenom: body.prenom,
        email: body.email || null,
        telephone: body.telephone || null,
        dateEntree: new Date(body.dateEntree),
        poste: body.poste,
        sousTraitantId: id,
        updatedAt: new Date()
      }
    })

    console.log('Ouvrier créé avec succès:', ouvrier);
    return NextResponse.json(ouvrier)
  } catch (error) {
    console.error('Erreur lors de la création de l\'ouvrier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'ouvrier' },
      { status: 500 }
    )
  }
} 