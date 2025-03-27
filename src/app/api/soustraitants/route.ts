import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const soustraitants = await prisma.soustraitant.findMany({
      orderBy: {
        nom: 'asc'
      }
    })

    console.log('Sous-traitants trouvés:', soustraitants)

    return NextResponse.json(soustraitants)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sous-traitants' },
      { status: 500 }
    )
  }
} 