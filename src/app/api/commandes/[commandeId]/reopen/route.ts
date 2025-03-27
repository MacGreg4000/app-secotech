import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { commandeId: string } }
) {
  try {
    const commandeId = parseInt(params.commandeId, 10);
    
    if (isNaN(commandeId)) {
      return NextResponse.json(
        { error: 'ID de commande invalide' },
        { status: 400 }
      );
    }

    // Récupérer la commande existante
    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
    });

    if (!commande) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Mettre à jour la commande pour la réouvrir
    const updatedCommande = await prisma.commande.update({
      where: { id: commandeId },
      data: { 
        estVerrouillee: false 
      },
    });

    return NextResponse.json(updatedCommande);
  } catch (error) {
    console.error('Erreur lors de la réouverture de la commande:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réouverture de la commande' },
      { status: 500 }
    );
  }
} 