import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier si l'utilisateur est admin ou manager
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const documentsDir = path.join(process.cwd(), 'public', 'documents', 'administratifs')
    const filePath = path.join(documentsDir, params.documentId)

    // Supprimer le fichier
    await unlink(filePath)

    return NextResponse.json({ message: 'Document supprimé avec succès' })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du document' }, { status: 500 })
  }
} 