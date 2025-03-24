import { NextResponse } from 'next/server'
import { signerContrat } from '@/lib/contrat-generator'

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { signature } = await request.json()
    
    if (!signature) {
      return NextResponse.json(
        { error: 'La signature est requise' },
        { status: 400 }
      )
    }
    
    // Signer le contrat
    const contratUrl = await signerContrat(params.token, signature)
    
    return NextResponse.json({ url: contratUrl })
  } catch (error: any) {
    console.error('Erreur lors de la signature du contrat:', error)
    return NextResponse.json(
      { error: `Erreur lors de la signature du contrat: ${error.message}` },
      { status: 500 }
    )
  }
} 