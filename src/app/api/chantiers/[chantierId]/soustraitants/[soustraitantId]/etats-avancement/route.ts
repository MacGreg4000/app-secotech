import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// Interface pour les photos
interface Photo {
  id: number;
  soustraitantEtatAvancementId: number;
  url: string;
  description: string | null;
  dateAjout: Date;
}

// GET /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement
// Récupère les états d'avancement d'un sous-traitant pour un chantier
export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer les paramètres de l'URL
    const { chantierId, soustraitantId } = await context.params

    // Vérifier que le sous-traitant existe pour ce chantier
    const soustraitantExists = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM soustraitant s
      JOIN commande_soustraitant cs ON s.id = cs.soustraitantId
      WHERE s.id = ${soustraitantId}
      AND cs.chantierId = ${chantierId}
    ` as { count: number }[]

    if (!soustraitantExists || !soustraitantExists[0] || soustraitantExists[0].count === 0) {
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé ou non associé à ce chantier' },
        { status: 404 }
      )
    }

    // Récupérer tous les états d'avancement du sous-traitant pour ce chantier
    const etatsAvancement = await prisma.soustraitant_etat_avancement.findMany({
      where: {
        soustraitantId: soustraitantId
      },
      orderBy: {
        numero: 'asc'
      }
    })

    // Récupérer le nom du sous-traitant
    const soustraitant = await prisma.soustraitant.findUnique({
      where: {
        id: soustraitantId
      },
      select: {
        nom: true
      }
    })

    // Formatter les résultats
    const formattedEtats = await Promise.all(
      etatsAvancement.map(async (etat) => {
        // Récupérer les lignes, avenants et photos séparément
        const lignes = await prisma.ligne_soustraitant_etat_avancement.findMany({
          where: {
            soustraitantEtatAvancementId: etat.id
          }
        })

        const avenants = await prisma.avenant_soustraitant_etat_avancement.findMany({
          where: {
            soustraitantEtatAvancementId: etat.id
          }
        })

        const photos = await prisma.$queryRaw`
          SELECT * FROM photo_soustraitant_etat_avancement 
          WHERE soustraitantEtatAvancementId = ${etat.id}
        ` as Photo[]

        return {
          id: etat.id,
          numero: etat.numero,
          soustraitantId: etat.soustraitantId,
          soustraitantNom: soustraitant?.nom || '',
          date: etat.date,
          commandeId: etat.commandeSousTraitantId,
          estFinalise: Boolean(etat.estFinalise),
          commentaires: etat.commentaires,
          lignes: lignes.map((ligne) => ({
            id: ligne.id,
            article: ligne.article,
            description: ligne.description,
            type: ligne.type,
            unite: ligne.unite,
            prixUnitaire: ligne.prixUnitaire,
            quantite: ligne.quantite,
            quantitePrecedente: ligne.quantitePrecedente,
            quantiteActuelle: ligne.quantiteActuelle,
            quantiteTotale: ligne.quantiteTotale,
            montantPrecedent: ligne.montantPrecedent,
            montantActuel: ligne.montantActuel,
            montantTotal: ligne.montantTotal
          })),
          avenants: avenants.map((avenant) => ({
            id: avenant.id,
            article: avenant.article,
            description: avenant.description,
            type: avenant.type,
            unite: avenant.unite,
            prixUnitaire: avenant.prixUnitaire,
            quantite: avenant.quantite,
            quantitePrecedente: avenant.quantitePrecedente,
            quantiteActuelle: avenant.quantiteActuelle,
            quantiteTotale: avenant.quantiteTotale,
            montantPrecedent: avenant.montantPrecedent,
            montantActuel: avenant.montantActuel,
            montantTotal: avenant.montantTotal
          })),
          photos: photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            description: photo.description,
            dateAjout: photo.dateAjout
          }))
        }
      })
    )
    
    return NextResponse.json(formattedEtats)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des états d\'avancement' },
      { status: 500 }
    )
  }
}

// POST /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement
// Crée un nouvel état d'avancement pour un sous-traitant
export async function POST(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string }> }
) {
  try {
    console.log('Début de la requête POST pour créer un état d\'avancement')
    console.log('Paramètres:', (await context.params))

    // Récupérer les paramètres de l'URL
    const { chantierId, soustraitantId } = await context.params

    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Session non authentifiée')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Corps de la requête:', body)
    const { commandeId } = body

    // Vérifier que le sous-traitant existe et est lié au chantier
    console.log('Vérification du sous-traitant:', soustraitantId)
    const soustraitantResult = await prisma.$queryRaw`
      SELECT s.*
      FROM soustraitant s
      JOIN commande_soustraitant cs ON s.id = cs.soustraitantId
      WHERE s.id = ${soustraitantId}
      AND cs.chantierId = ${chantierId}
      LIMIT 1
    ` as any[]

    console.log('Résultat de la requête sous-traitant:', soustraitantResult)
    if (!soustraitantResult || soustraitantResult.length === 0) {
      console.log('Sous-traitant non trouvé ou non associé au chantier')
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé ou non associé à ce chantier' },
        { status: 404 }
      )
    }

    const soustraitant = soustraitantResult[0]
    console.log('Sous-traitant trouvé:', soustraitant.nom)

    // Vérifier que la commande existe et appartient au sous-traitant
    console.log('Vérification de la commande:', commandeId)
    const commande = await prisma.commandeSousTraitant.findFirst({
      where: {
        id: commandeId,
        soustraitantId: soustraitantId,
        chantierId: chantierId
      },
      include: {
        lignes: true
      }
    })

    console.log('Résultat de la requête commande:', commande)
    if (!commande) {
      console.log('Commande sous-traitant non trouvée')
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que la commande est verrouillée
    if (!commande.estVerrouillee) {
      console.log('La commande n\'est pas verrouillée')
      return NextResponse.json(
        { error: 'La commande doit être verrouillée avant de créer un état d\'avancement' },
        { status: 400 }
      )
    }

    // Vérifier si c'est le premier état d'avancement
    const existingEtats = await prisma.soustraitant_etat_avancement.count({
      where: {
        soustraitantId: soustraitantId
      }
    })

    console.log('Nombre d\'états existants:', existingEtats)

    // Récupérer le dernier état d'avancement
    const lastEtat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        soustraitantId: soustraitantId
      },
      orderBy: {
        numero: 'desc'
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true
      }
    })

    // Vérifier que le dernier état est finalisé (sauf s'il n'y a pas d'état précédent)
    if (lastEtat && !lastEtat.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état.' },
        { status: 400 }
      )
    }

    // Récupérer dernier état client (nécessaire pour lier à l'état sous-traitant)
    const dernierEtatClient = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierId
      },
      orderBy: {
        numero: 'desc'
      }
    })

    if (!dernierEtatClient) {
      return NextResponse.json(
        { error: 'Aucun état d\'avancement client trouvé pour ce chantier' },
        { status: 404 }
      )
    }

    const nextNumero = lastEtat ? lastEtat.numero + 1 : 1
    console.log('Prochain numéro:', nextNumero)

    // Créer le nouvel état d'avancement
    const etatAvancement = await prisma.soustraitant_etat_avancement.create({
      data: {
        soustraitantId: soustraitantId,
        commandeSousTraitantId: commande.id,
        numero: nextNumero,
        date: new Date(),
        etatAvancementId: dernierEtatClient.id,
        estFinalise: false,
        updatedAt: new Date()
      }
    })

    console.log('État créé:', etatAvancement)

    // Si c'est le premier état, charger les lignes de la commande
    if (existingEtats === 0) {
      console.log('Premier état, chargement de la commande...')
      
      if (commande.lignes && commande.lignes.length > 0) {
        console.log('Création des lignes à partir de la commande...')
        // Créer les lignes d'état d'avancement à partir des lignes de commande
        await Promise.all(commande.lignes.map(ligne =>
          prisma.ligne_soustraitant_etat_avancement.create({
            data: {
              soustraitantEtatAvancementId: etatAvancement.id,
              article: ligne.article,
              description: ligne.description,
              type: ligne.type || 'QP',
              unite: ligne.unite,
              prixUnitaire: ligne.prixUnitaire,
              quantite: ligne.quantite,
              quantitePrecedente: 0,
              quantiteActuelle: 0,
              quantiteTotale: 0,
              montantPrecedent: 0,
              montantActuel: 0,
              montantTotal: 0,
              updatedAt: new Date()
            }
          })
        ))
        console.log('Lignes créées avec succès')
      } else {
        console.log('La commande ne contient pas de lignes')
      }
    } else if (lastEtat) {
      // Pour les états suivants, copier les lignes du dernier état
      console.log('Copie des lignes du dernier état finalisé...')
      
      await Promise.all(lastEtat.ligne_soustraitant_etat_avancement.map(ligne =>
        prisma.ligne_soustraitant_etat_avancement.create({
          data: {
            soustraitantEtatAvancementId: etatAvancement.id,
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
            montantTotal: ligne.montantTotal, // Commencer avec le total précédent
            updatedAt: new Date()
          }
        })
      ))
      
      console.log('Lignes copiées avec succès')
      
      // Copier également les avenants du dernier état
      console.log('Copie des avenants du dernier état finalisé...')
      
      if (lastEtat.avenant_soustraitant_etat_avancement && lastEtat.avenant_soustraitant_etat_avancement.length > 0) {
        // Créer une copie des avenants pour le nouvel état
        await Promise.all(lastEtat.avenant_soustraitant_etat_avancement.map(avenant =>
          prisma.avenant_soustraitant_etat_avancement.create({
            data: {
              soustraitantEtatAvancementId: etatAvancement.id,
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
              montantTotal: avenant.montantTotal, // Commencer avec le total précédent
              updatedAt: new Date()
            }
          })
        ))
        console.log('Avenants copiés avec succès')
      } else {
        console.log('Aucun avenant à copier')
      }
    }

    // Retourner l'état d'avancement complet avec ses lignes
    const etatAvancementComplet = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: etatAvancement.id
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true,
        soustraitant: true
      }
    })

    return NextResponse.json({
      id: etatAvancementComplet?.id,
      numero: etatAvancementComplet?.numero,
      date: etatAvancementComplet?.date,
      soustraitantId: etatAvancementComplet?.soustraitantId,
      soustraitantNom: etatAvancementComplet?.soustraitant.nom,
      lignes: etatAvancementComplet?.ligne_soustraitant_etat_avancement,
      avenants: etatAvancementComplet?.avenant_soustraitant_etat_avancement,
      estFinalise: etatAvancementComplet?.estFinalise
    })
  } catch (error) {
    console.error('Erreur détaillée:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 