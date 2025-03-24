import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePPSS } from '@/lib/ppss-generator'

export async function POST(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    // Générer le PPSS
    const document = await generatePPSS(params.chantierId, session.user.id)
    
    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Erreur lors de la génération du PPSS:', error)
    return NextResponse.json(
      { error: `Erreur lors de la génération du PPSS: ${error.message}` },
      { status: 500 }
    )
  }
} 