import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContratSoustraitance } from '@/lib/contrat-generator'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    // Générer le contrat
    const contratUrl = await generateContratSoustraitance(params.id, session.user.id)
    
    return NextResponse.json({ url: contratUrl })
  } catch (error: any) {
    console.error('Erreur lors de la génération du contrat:', error)
    return NextResponse.json(
      { error: `Erreur lors de la génération du contrat: ${error.message}` },
      { status: 500 }
    )
  }
} 