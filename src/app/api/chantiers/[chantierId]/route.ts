import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/chantiers/[chantierId] - Récupère un chantier spécifique
export async function GET(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: params.chantierId,
      },
      include: {
        client: true,
      },
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    return NextResponse.json(chantier)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du chantier' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId] - Met à jour un chantier
export async function PUT(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const chantier = await prisma.chantier.update({
      where: { chantierId: params.chantierId },
      data: {
        nomChantier: body.nomChantier,
        dateCommencement: new Date(body.dateCommencement),
        etatChantier: body.etatChantier,
        clientNom: body.clientNom,
        clientEmail: body.clientEmail,
        clientAdresse: body.clientAdresse,
        adresseChantier: body.adresseChantier,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        dureeEnJours: body.dureeEnJours ? parseInt(body.dureeEnJours) : null,
        clientId: body.clientId || null,
        montantTotal: body.montantTotal ? parseFloat(body.montantTotal) : 0
      }
    })

    // Régénérer le PPSS après la mise à jour du chantier
    try {
      // Supprimer l'ancien document PPSS s'il existe
      const existingDocument = await prisma.document.findFirst({
        where: {
          chantierId: params.chantierId,
          type: 'PPSS'
        }
      })

      if (existingDocument) {
        // Supprimer le fichier physique
        try {
          const { unlink } = require('fs/promises');
          const { join } = require('path');
          const filePath = join(process.cwd(), 'public', existingDocument.url);
          await unlink(filePath);
          console.log(`Ancien fichier PPSS supprimé: ${filePath}`);
        } catch (fileError) {
          console.error('Erreur lors de la suppression du fichier PPSS:', fileError);
          // Continuer même si la suppression du fichier échoue
        }

        // Supprimer l'entrée dans la base de données
        await prisma.document.delete({
          where: { id: existingDocument.id }
        })
      }

      // Appel à l'API pour générer le nouveau PPSS
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
      const ppssResponse = await fetch(`${baseUrl}/api/chantiers/${params.chantierId}/generer-ppss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Transmettre les cookies pour l'authentification
          'Cookie': request.headers.get('cookie') || ''
        }
      })
      
      if (!ppssResponse.ok) {
        console.error('Erreur lors de la régénération du PPSS:', await ppssResponse.text())
      }
    } catch (ppssError) {
      console.error('Erreur lors de la régénération du PPSS:', ppssError)
      // Ne pas bloquer la mise à jour du chantier si la génération du PPSS échoue
    }

    return NextResponse.json(chantier)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du chantier' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId] - Supprime un chantier
export async function DELETE(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour supprimer un chantier' },
        { status: 401 }
      )
    }

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le chantier
    await prisma.chantier.delete({
      where: { chantierId: params.chantierId }
    })

    return NextResponse.json(
      { message: 'Chantier supprimé avec succès' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la suppression du chantier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du chantier' },
      { status: 500 }
    )
  }
} 