import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// GET /api/notes - Récupère toutes les notes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chantierId = searchParams.get('chantierId');
    
    const where = chantierId ? { chantierId } : {};
    
    const notes = await prisma.note.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notes' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Crée une nouvelle note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chantierId, contenu, createdBy } = body;

    if (!chantierId || !contenu || !createdBy) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
    });

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      );
    }

    // Créer la note
    const newNote = await prisma.note.create({
      data: {
        chantierId,
        contenu,
        createdBy,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création de la note:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la note' },
      { status: 500 }
    );
  }
} 