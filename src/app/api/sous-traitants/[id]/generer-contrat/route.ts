import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContratSoustraitance } from '@/lib/contrat-generator'

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    // Extraire l'ID du sous-traitant depuis les paramètres de route
    const { id } = context.params
    
    // Générer le contrat
    const contratUrl = await generateContratSoustraitance(id, session.user.id)
    
    return NextResponse.json({ url: contratUrl })
  } catch (error: any) {
    console.error('Erreur lors de la génération du contrat:', error)
    return NextResponse.json(
      { error: `Erreur lors de la génération du contrat: ${error.message}` },
      { status: 500 }
    )
  }
} 