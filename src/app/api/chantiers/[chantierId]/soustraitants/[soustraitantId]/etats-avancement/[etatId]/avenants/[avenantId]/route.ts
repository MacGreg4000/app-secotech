import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: {
    chantierId: string
    soustraitantId: string
    etatId: string
    avenantId: string
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  
  const { chantierId, soustraitantId, etatId, avenantId } = params
  
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
    
    // Vérifier si l'avenant existe
    const avenantExistant = await prisma.avenant_soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(avenantId),
      }
    })
    
    if (!avenantExistant) {
      return NextResponse.json({ error: 'Avenant non trouvé' }, { status: 404 })
    }
    
    // Récupérer les données du body
    const data = await request.json()
    const now = new Date();
    
    // Mettre à jour l'avenant
    const updatedAvenant = await prisma.avenant_soustraitant_etat_avancement.update({
      where: {
        id: parseInt(avenantId),
      },
      data: {
        article: data.article !== undefined ? data.article : avenantExistant.article,
        description: data.description !== undefined ? data.description : avenantExistant.description,
        type: data.type !== undefined ? data.type : avenantExistant.type,
        unite: data.unite !== undefined ? data.unite : avenantExistant.unite,
        prixUnitaire: data.prixUnitaire !== undefined ? data.prixUnitaire : avenantExistant.prixUnitaire,
        quantite: data.quantite !== undefined ? data.quantite : avenantExistant.quantite,
        quantitePrecedente: data.quantitePrecedente !== undefined ? data.quantitePrecedente : avenantExistant.quantitePrecedente,
        quantiteActuelle: data.quantiteActuelle !== undefined ? data.quantiteActuelle : avenantExistant.quantiteActuelle,
        quantiteTotale: data.quantiteTotale !== undefined ? data.quantiteTotale : avenantExistant.quantiteTotale,
        montantPrecedent: data.montantPrecedent !== undefined ? data.montantPrecedent : avenantExistant.montantPrecedent,
        montantActuel: data.montantActuel !== undefined ? data.montantActuel : avenantExistant.montantActuel,
        montantTotal: data.montantTotal !== undefined ? data.montantTotal : avenantExistant.montantTotal,
        updatedAt: now
      }
    })
    
    return NextResponse.json(updatedAvenant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  
  const { chantierId, soustraitantId, etatId, avenantId } = params
  
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