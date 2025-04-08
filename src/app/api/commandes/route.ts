import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const commandeData = await request.json()
    console.log('Données reçues par l\'API:', commandeData)

    // Vérifier que le client existe si un clientId est fourni
    if (commandeData.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: commandeData.clientId }
      })
      if (!client) {
        return NextResponse.json(
          { error: 'Client non trouvé' },
          { status: 400 }
        )
      }
    }

    // Validation des données
    if (!commandeData.chantierId) {
      return NextResponse.json({ error: 'chantierId est requis' }, { status: 400 })
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: commandeData.chantierId }
    })
    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 400 })
    }

    try {
      // Vérifier si c'est une mise à jour (ID fourni) ou une création
      let commande: any;
      
      if (commandeData.id) {
        // C'est une mise à jour
        console.log('Mise à jour de la commande existante avec ID:', commandeData.id);
        
        // Vérifier que la commande existe
        const existingCommande = await prisma.commande.findUnique({
          where: { id: Number(commandeData.id) }
        });
        
        if (!existingCommande) {
          return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
        }
        
        // Préparer les données pour la mise à jour
        const commandeUpdateData = {
          chantierId: commandeData.chantierId,
          clientId: commandeData.clientId,
          dateCommande: new Date(commandeData.dateCommande),
          reference: commandeData.reference || null,
          tauxTVA: Number(commandeData.tauxTVA) || 0,
          sousTotal: Number(commandeData.sousTotal) || 0,
          totalOptions: Number(commandeData.totalOptions) || 0,
          tva: Number(commandeData.tva) || 0,
          total: Number(commandeData.total) || 0,
          statut: commandeData.statut,
          estVerrouillee: Boolean(commandeData.estVerrouillee)
        };
        
        console.log('Données préparées pour la mise à jour:', commandeUpdateData);
        
        // Mettre à jour la commande
        commande = await prisma.commande.update({
          where: { id: Number(commandeData.id) },
          data: commandeUpdateData
        });
        
        // Supprimer toutes les lignes existantes
        await prisma.ligneCommande.deleteMany({
          where: { commandeId: Number(commandeData.id) }
        });
        
        // Si des lignes sont fournies, les créer
        if (commandeData.lignes && Array.isArray(commandeData.lignes) && commandeData.lignes.length > 0) {
          // Créer les nouvelles lignes
          await prisma.ligneCommande.createMany({
            data: commandeData.lignes.map((ligne: any) => ({
              commandeId: commande.id,
              ordre: Number(ligne.ordre) || 0,
              article: ligne.article || '',
              description: ligne.description || '',
              type: ligne.type || 'QP',
              unite: ligne.unite || 'Pièces',
              prixUnitaire: Number(ligne.prixUnitaire) || 0,
              quantite: Number(ligne.quantite) || 0,
              total: Number(ligne.total) || 0,
              estOption: Boolean(ligne.estOption)
            }))
          });
        }
      } else {
        // C'est une création
        console.log('Création d\'une nouvelle commande');
        
        // Préparer les données pour la création
        const commandeCreateData = {
          chantierId: commandeData.chantierId,
          clientId: commandeData.clientId,
          dateCommande: new Date(commandeData.dateCommande),
          reference: commandeData.reference || null,
          tauxTVA: Number(commandeData.tauxTVA) || 0,
          sousTotal: Number(commandeData.sousTotal) || 0,
          totalOptions: Number(commandeData.totalOptions) || 0,
          tva: Number(commandeData.tva) || 0,
          total: Number(commandeData.total) || 0,
          statut: commandeData.statut,
          estVerrouillee: Boolean(commandeData.estVerrouillee)
        };
        
        console.log('Données préparées pour la création:', commandeCreateData);
        
        // Créer la commande
        commande = await prisma.commande.create({
          data: commandeCreateData
        });
        
        // Si des lignes sont fournies, les créer
        if (commandeData.lignes && Array.isArray(commandeData.lignes) && commandeData.lignes.length > 0) {
          // Créer les lignes de commande
          await prisma.ligneCommande.createMany({
            data: commandeData.lignes.map((ligne: any) => ({
              commandeId: commande.id,
              ordre: Number(ligne.ordre) || 0,
              article: ligne.article || '',
              description: ligne.description || '',
              type: ligne.type || 'QP',
              unite: ligne.unite || 'Pièces',
              prixUnitaire: Number(ligne.prixUnitaire) || 0,
              quantite: Number(ligne.quantite) || 0,
              total: Number(ligne.total) || 0,
              estOption: Boolean(ligne.estOption)
            }))
          });
        }
      }

      // Mettre à jour le montant total du chantier
      // @ts-ignore - Ignorer les erreurs de type ici
      const commandes = await prisma.commande.findMany({
        where: { chantierId: commandeData.chantierId }
      });
      
      // Calculer le montant total en additionnant uniquement les commandes avec statut VALIDEE
      const montantTotal = commandes
        .filter((cmd: any) => cmd.statut === 'VALIDEE' || cmd.statut === 'VERROUILLEE')
        .reduce((sum: number, cmd: any) => sum + Number(cmd.total), 0);
      
      console.log('Montant total calculé:', montantTotal, 'à partir de', commandes.length, 'commandes');
      console.log('Commandes prises en compte:', commandes.filter((cmd: any) => cmd.statut === 'VALIDEE' || cmd.statut === 'VERROUILLEE').length);
      
      // Mise à jour du budget du chantier avec le montant total des commandes
      await prisma.chantier.update({
        where: { chantierId: commandeData.chantierId },
        data: { budget: montantTotal }
      });

      // Récupérer la commande avec ses lignes
      const commandeWithLignes = await prisma.commande.findUnique({
        where: { id: commande.id },
        include: { lignes: true }
      });

      return NextResponse.json(commandeWithLignes);
    } catch (dbError: any) {
      console.error('Erreur base de données:', dbError)
      return NextResponse.json(
        { error: `Erreur lors de la création de la commande: ${dbError.message}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chantierId = searchParams.get('chantierId')

    if (!chantierId) {
      return NextResponse.json({ error: 'chantierId requis' }, { status: 400 })
    }

    // @ts-ignore - Ignorer les erreurs de type ici
    const commandes = await prisma.commande.findMany({
      where: { chantierId },
      include: { lignes: true },
      orderBy: { dateCommande: 'desc' }
    })

    return NextResponse.json(commandes)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    )
  }
} 