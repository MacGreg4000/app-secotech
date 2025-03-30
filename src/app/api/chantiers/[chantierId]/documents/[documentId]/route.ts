import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { unlink } from 'fs/promises'
import { join } from 'path'

const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

export async function DELETE(
  request: Request,
  props: { params: Promise<{ chantierId: string; documentId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Non autorisé', { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: {
        id: parseInt(params.documentId),
        chantierId: params.chantierId
      }
    })

    if (!document) {
      return new NextResponse('Document non trouvé', { status: 404 })
    }

    // Supprimer le fichier physique
    const filePath = join(process.cwd(), 'public', document.url)
    try {
      await unlink(filePath)
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error)
      // Continuer même si le fichier n'existe pas
    }

    // Supprimer l'entrée dans la base de données
    await prisma.document.delete({
      where: {
        id: parseInt(params.documentId)
      }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Erreur:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la suppression du document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 