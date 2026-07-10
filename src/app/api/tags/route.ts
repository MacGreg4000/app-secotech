import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canonicalTagName, normalizeTagKey } from '@/lib/utils/tags';
// Retrait de l'import Prisma non nécessaire, utilisation de guards runtime

// GET /api/tags - Récupérer tous les tags
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Pour l'instant, nous ne filtrons pas par contexte (administratif, chantier)
    // mais on pourrait ajouter un searchParam pour cela plus tard si nécessaire.
    // const { searchParams } = new URL(request.url);
    // const context = searchParams.get('context'); 

    const tags = await prisma.tag.findMany({
      orderBy: {
        nom: 'asc',
      },
      select: {
        id: true,
        nom: true,
      }
    });

    return NextResponse.json(tags);

  } catch (error) {
    console.error("Erreur lors de la récupération des tags:", error);
    return NextResponse.json({ error: 'Erreur serveur lors de la récupération des tags' }, { status: 500 });
  }
}

// POST /api/tags - Créer un nouveau tag
export async function POST(request: Request) {
  let nom: string | undefined
  try {
    const body = await request.json();
    nom = canonicalTagName(body?.nom || '');

    if (!nom) {
      return new NextResponse('Le nom du tag est requis', { status: 400 });
    }

    // Vérifier si un tag équivalent existe déjà (insensible à la casse ET aux accents).
    // La colonne `nom` est unique mais sensible à la casse en base : on compare donc
    // via la clé normalisée côté application sur l'ensemble des tags (volume faible).
    const key = normalizeTagKey(nom)
    const allTags = await prisma.tag.findMany({ select: { id: true, nom: true } })
    const existingTag = allTags.find(t => normalizeTagKey(t.nom) === key)

    if (existingTag) {
      return NextResponse.json(existingTag, { status: 200 }); // Retourner le tag existant
    }

    const newTag = await prisma.tag.create({
      data: {
        nom,
      },
    });
    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('[API_TAGS_POST]', error);
    if (typeof error === 'object' && error && 'code' in error) {
      // Contrainte unique violée (requêtes quasi-simultanées) : renvoyer le tag existant
      if ((error as { code?: string }).code === 'P2002' && nom) {
        const conflictingTag = await prisma.tag.findUnique({ where: { nom } });
        if (conflictingTag) return NextResponse.json(conflictingTag, { status: 200 });
        return new NextResponse('Un tag avec ce nom existe déjà (conflit de base de données).', { status: 409 });
      }
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 