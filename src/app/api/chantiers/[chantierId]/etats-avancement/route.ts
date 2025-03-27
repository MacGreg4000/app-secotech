import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/chantiers/[chantierId]/etats-avancement
export async function GET(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const etatsAvancement = await prisma.etatAvancement.findMany({
      where: {
        chantierId: params.chantierId
      },
      include: {
        lignes: true,
        avenants: true,
        chantier: true
      },
      orderBy: {
        numero: 'desc'
      }
    })

    return NextResponse.json(etatsAvancement)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des états d\'avancement' },
      { status: 500 }
    )
  }
}

// POST /api/chantiers/[chantierId]/etats-avancement
export async function POST(
  request: Request,
  { params }: { params: { chantierId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si c'est le premier état d'avancement
    const existingEtats = await prisma.etatAvancement.count({
      where: {
        chantierId: params.chantierId
      }
    })

    console.log('Nombre d\'états existants:', existingEtats)

    // Récupérer le dernier état d'avancement
    const lastEtat = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: params.chantierId
      },
      orderBy: {
        numero: 'desc'
      },
      include: {
        lignes: true,
        avenants: true
      }
    })

    // Vérifier que le dernier état est finalisé (sauf s'il n'y a pas d'état précédent)
    if (lastEtat && !lastEtat.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état.' },
        { status: 400 }
      )
    }

    const nextNumero = lastEtat ? lastEtat.numero + 1 : 1
    console.log('Prochain numéro:', nextNumero)
    
    // Log des commentaires de l'état précédent
    console.log('Commentaires de l\'état précédent:', lastEtat?.commentaires);
    
    // Si l'état précédent existe, récupérer ses commentaires à jour
    let commentairesAReprendre = '';
    if (lastEtat) {
      try {
        // Récupérer l'état précédent avec ses commentaires à jour
        const etatPrecedent = await prisma.etatAvancement.findUnique({
          where: {
            id: lastEtat.id
          }
        });
        
        if (etatPrecedent && etatPrecedent.commentaires) {
          commentairesAReprendre = etatPrecedent.commentaires;
          console.log('Commentaires récupérés de l\'état précédent:', commentairesAReprendre);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des commentaires de l\'état précédent:', error);
      }
    }

    // Créer le nouvel état d'avancement
    const etatAvancement = await prisma.etatAvancement.create({
      data: {
        chantierId: params.chantierId,
        numero: nextNumero,
        createdBy: session.user.email || '',
        estFinalise: false,
        commentaires: commentairesAReprendre || lastEtat?.commentaires || '' // Copier les commentaires de l'état précédent pour préserver l'historique
      }
    })

    console.log('État créé avec commentaires:', etatAvancement.commentaires)

    // Si c'est le premier état, charger les lignes de la commande
    if (existingEtats === 0) {
      console.log('Premier état, chargement de la commande...')
      const commande = await prisma.commande.findFirst({
        where: {
          chantierId: params.chantierId,
          statut: 'VALIDEE'
        },
        include: {
          lignes: true
        }
      })

      console.log('Commande trouvée:', commande)

      if (commande) {
        console.log('Création des lignes à partir de la commande...')
        // Créer les lignes d'état d'avancement à partir des lignes de commande
        await Promise.all(commande.lignes.map(ligne =>
          prisma.ligneEtatAvancement.create({
            data: {
              etatAvancementId: etatAvancement.id,
              ligneCommandeId: ligne.id,
              article: ligne.article,
              description: ligne.description,
              type: ligne.type,
              unite: ligne.unite,
              prixUnitaire: ligne.prixUnitaire,
              quantite: ligne.quantite,
              quantitePrecedente: 0,
              quantiteActuelle: 0,
              quantiteTotale: 0,
              montantPrecedent: 0,
              montantActuel: 0,
              montantTotal: 0
            }
          })
        ))
        console.log('Lignes créées avec succès')
      } else {
        console.log('Aucune commande validée trouvée')
      }
    } else if (lastEtat) {
      // Pour les états suivants, copier les lignes du dernier état
      console.log('Copie des lignes du dernier état finalisé...')
      
      await Promise.all(lastEtat.lignes.map(ligne =>
        prisma.ligneEtatAvancement.create({
          data: {
            etatAvancementId: etatAvancement.id,
            ligneCommandeId: ligne.ligneCommandeId,
            article: ligne.article,
            description: ligne.description,
            type: ligne.type,
            unite: ligne.unite,
            prixUnitaire: ligne.prixUnitaire,
            quantite: ligne.quantite,
            // Mettre à jour les valeurs précédentes avec les totales de l'état précédent
            quantitePrecedente: ligne.quantiteTotale,
            quantiteActuelle: 0,
            quantiteTotale: ligne.quantiteTotale, // Commencer avec le total précédent
            montantPrecedent: ligne.montantTotal,
            montantActuel: 0,
            montantTotal: ligne.montantTotal // Commencer avec le total précédent
          }
        })
      ))
      
      console.log('Lignes copiées avec succès')
      
      // Copier également les avenants du dernier état
      console.log('Copie des avenants du dernier état finalisé...')
      
      if (lastEtat.avenants && lastEtat.avenants.length > 0) {
        // Créer une copie des avenants pour le nouvel état
        await Promise.all(lastEtat.avenants.map(avenant =>
          prisma.avenantEtatAvancement.create({
            data: {
              etatAvancementId: etatAvancement.id,
              article: avenant.article,
              description: avenant.description,
              type: avenant.type,
              unite: avenant.unite,
              prixUnitaire: avenant.prixUnitaire,
              quantite: avenant.quantite,
              // Mettre à jour les valeurs précédentes avec les totales de l'état précédent
              quantitePrecedente: avenant.quantiteTotale,
              quantiteActuelle: 0,
              quantiteTotale: avenant.quantiteTotale, // Commencer avec le total précédent
              montantPrecedent: avenant.montantTotal,
              montantActuel: 0,
              montantTotal: avenant.montantTotal // Commencer avec le total précédent
            }
          })
        ))
        console.log('Avenants copiés avec succès')
      } else {
        console.log('Aucun avenant à copier')
      }
    }

    // Retourner l'état d'avancement avec ses lignes
    const etatAvancementComplet = await prisma.etatAvancement.findUnique({
      where: {
        id: etatAvancement.id
      },
      include: {
        lignes: true,
        avenants: true,
        chantier: true
      }
    })

    console.log('État complet à retourner:', etatAvancementComplet)
    return NextResponse.json(etatAvancementComplet)
  } catch (error) {
    console.error('Erreur détaillée:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 