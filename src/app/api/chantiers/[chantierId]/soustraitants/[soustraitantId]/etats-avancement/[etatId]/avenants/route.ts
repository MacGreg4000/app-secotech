import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  
  const { chantierId, soustraitantId, etatId } = await context.params
  
  try {
    // Vérifier l'accès au chantier
    const userHasAccess = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        OR: [
          { role: 'ADMIN' },
          { role: 'MANAGER' },
        ]
      }
    })
    
    if (!userHasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }
    
    // Vérifier si l'état existe
    const etatExistant = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(etatId),
        soustraitantId: soustraitantId,
      }
    })
    
    if (!etatExistant) {
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }
    
    // Vérifier si l'état est finalisé
    if (etatExistant.estFinalise) {
      return NextResponse.json({ error: 'Impossible de modifier un état finalisé' }, { status: 400 })
    }
    
    // Récupérer les données du body
    const data = await request.json()
    const now = new Date();
    
    // Créer le nouvel avenant
    const newAvenant = await prisma.avenant_soustraitant_etat_avancement.create({
      data: {
        soustraitant_etat_avancement: {
          connect: {
            id: parseInt(etatId)
          }
        },
        article: data.article || '',
        description: data.description || '',
        type: data.type || 'QP',
        unite: data.unite || 'U',
        prixUnitaire: data.prixUnitaire || 0,
        quantite: data.quantite || 0,
        quantitePrecedente: data.quantitePrecedente || 0,
        quantiteActuelle: data.quantiteActuelle || 0,
        quantiteTotale: data.quantiteTotale || 0,
        montantPrecedent: data.montantPrecedent || 0,
        montantActuel: data.montantActuel || 0,
        montantTotal: data.montantTotal || 0,
        createdAt: now,
        updatedAt: now
      },
    })
    
    return NextResponse.json(newAvenant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  
  const { chantierId, soustraitantId, etatId } = await context.params
  const searchParams = request.nextUrl.searchParams
  const avenantId = searchParams.get('avenantId')
  
  if (!avenantId) {
    return NextResponse.json({ error: 'ID d\'avenant manquant' }, { status: 400 })
  }
  
  try {
    // Vérifier l'accès au chantier
    const userHasAccess = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        OR: [
          { role: 'ADMIN' },
          { role: 'MANAGER' },
        ]
      }
    })
    
    if (!userHasAccess) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }
    
    // Vérifier si l'état existe et n'est pas finalisé
    const etat = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(etatId),
        soustraitantId: soustraitantId,
      },
    })
    
    if (!etat) {
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }
    
    if (etat.estFinalise) {
      return NextResponse.json({ error: 'Impossible de modifier un état finalisé' }, { status: 400 })
    }
    
    // Supprimer l'avenant
    await prisma.avenant_soustraitant_etat_avancement.delete({
      where: {
        id: parseInt(avenantId),
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 