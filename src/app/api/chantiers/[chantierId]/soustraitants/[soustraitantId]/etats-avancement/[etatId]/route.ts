import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: {
    chantierId: string
    soustraitantId: string
    etatId: string
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  
  const { chantierId, soustraitantId, etatId } = params
  
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
    
    // Récupérer l'état d'avancement du sous-traitant
    const etat = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(etatId),
        soustraitantId: soustraitantId,
      },
      include: {
        ligne_soustraitant_etat_avancement: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        avenant_soustraitant_etat_avancement: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })
    
    if (!etat) {
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }
    
    // Transformer la réponse pour correspondre à l'interface SoustraitantEtat
    const formattedEtat = {
      ...etat,
      lignes: etat.ligne_soustraitant_etat_avancement,
      avenants: etat.avenant_soustraitant_etat_avancement
    };
    
    return NextResponse.json(formattedEtat)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  
  const { chantierId, soustraitantId, etatId } = params
  
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
    
    // Mettre à jour l'état d'avancement
    const updatedEtat = await prisma.soustraitant_etat_avancement.update({
      where: {
        id: parseInt(etatId),
      },
      data: {
        commentaires: data.commentaires,
        // Autres champs à mettre à jour...
      }
    })
    
    // Mettre à jour les lignes si présentes
    if (data.lignes && Array.isArray(data.lignes)) {
      for (const ligne of data.lignes) {
        if (ligne.id) {
          // Mettre à jour une ligne existante
          await prisma.ligne_soustraitant_etat_avancement.update({
            where: {
              id: ligne.id,
            },
            data: {
              quantitePrecedente: ligne.quantitePrecedente,
              quantiteActuelle: ligne.quantiteActuelle,
              quantiteTotale: ligne.quantiteTotale,
              montantPrecedent: ligne.montantPrecedent,
              montantActuel: ligne.montantActuel,
              montantTotal: ligne.montantTotal,
            }
          })
        }
      }
    }
    
    // Mettre à jour les avenants si présents
    if (data.avenants && Array.isArray(data.avenants)) {
      for (const avenant of data.avenants) {
        if (avenant.id) {
          // Mettre à jour un avenant existant
          await prisma.avenant_soustraitant_etat_avancement.update({
            where: {
              id: avenant.id,
            },
            data: {
              quantitePrecedente: avenant.quantitePrecedente,
              quantiteActuelle: avenant.quantiteActuelle,
              quantiteTotale: avenant.quantiteTotale,
              montantPrecedent: avenant.montantPrecedent,
              montantActuel: avenant.montantActuel,
              montantTotal: avenant.montantTotal,
            }
          })
        }
      }
    }
    
    // Récupérer l'état mis à jour avec toutes les relations
    const etatMisAJour = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(etatId),
      },
      include: {
        ligne_soustraitant_etat_avancement: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        avenant_soustraitant_etat_avancement: true
      }
    })
    
    if (!etatMisAJour) {
      return NextResponse.json({ error: 'État d\'avancement non trouvé après mise à jour' }, { status: 404 })
    }
    
    // Transformer la réponse pour correspondre à l'interface SoustraitantEtat
    const formattedEtat = {
      ...etatMisAJour,
      lignes: etatMisAJour.ligne_soustraitant_etat_avancement,
      avenants: etatMisAJour.avenant_soustraitant_etat_avancement
    };
    
    return NextResponse.json(formattedEtat)
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
  
  const { chantierId, soustraitantId, etatId } = params
  
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
      return NextResponse.json({ error: 'Impossible de supprimer un état finalisé' }, { status: 400 })
    }
    
    // Supprimer les lignes associées
    await prisma.ligne_soustraitant_etat_avancement.deleteMany({
      where: {
        soustraitantEtatAvancementId: parseInt(etatId),
      },
    })
    
    // Supprimer l'état d'avancement
    await prisma.soustraitant_etat_avancement.delete({
      where: {
        id: parseInt(etatId),
      },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 