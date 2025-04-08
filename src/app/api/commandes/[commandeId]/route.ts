import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ commandeId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const id = parseInt(params.commandeId)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de commande invalide' }, { status: 400 })
    }

    const commande = await prisma.commande.findUnique({
      where: { id },
      include: { lignes: true }
    })

    if (!commande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    return NextResponse.json(commande)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la commande' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, props: { params: Promise<{ commandeId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const id = parseInt(params.commandeId)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de commande invalide' }, { status: 400 })
    }

    // Vérifier que la commande existe
    const existingCommande = await prisma.commande.findUnique({
      where: { id }
    })

    if (!existingCommande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    const commandeData = await request.json()
    console.log('Données reçues pour mise à jour:', commandeData)

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
    }

    // Mettre à jour la commande
    const updatedCommande = await prisma.commande.update({
      where: { id },
      data: commandeUpdateData
    })

    // Mettre à jour les lignes si elles sont fournies
    if (commandeData.lignes && Array.isArray(commandeData.lignes)) {
      // Supprimer toutes les lignes existantes
      await prisma.ligneCommande.deleteMany({
        where: { commandeId: id }
      })

      // Créer les nouvelles lignes
      if (commandeData.lignes.length > 0) {
        await prisma.ligneCommande.createMany({
          data: commandeData.lignes.map((ligne: any) => ({
            commandeId: id,
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
        })
      }
    }

    // Mettre à jour le montant total du chantier
    // @ts-ignore - Ignorer les erreurs de type ici
    const commandes = await prisma.commande.findMany({
      where: { chantierId: commandeData.chantierId }
    })
    
    // Calculer le montant total en additionnant uniquement les commandes avec statut VALIDEE
    const montantTotal = commandes
      .filter((cmd: any) => cmd.statut === 'VALIDEE')
      .reduce((sum: number, cmd: any) => sum + Number(cmd.total), 0)
    
    console.log('Montant total calculé:', montantTotal, 'à partir de', commandes.length, 'commandes')
    
    await prisma.chantier.update({
      where: { chantierId: commandeData.chantierId },
      data: { budget: montantTotal }
    })

    // Récupérer la commande mise à jour avec ses lignes
    const commandeWithLignes = await prisma.commande.findUnique({
      where: { id },
      include: { lignes: true }
    })

    return NextResponse.json(commandeWithLignes)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ commandeId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const id = parseInt(params.commandeId)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de commande invalide' }, { status: 400 })
    }

    // Récupérer la commande pour obtenir le chantierId
    const commande = await prisma.commande.findUnique({
      where: { id }
    })

    if (!commande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    // Supprimer d'abord les lignes de commande
    await prisma.ligneCommande.deleteMany({
      where: { commandeId: id }
    })

    // Puis supprimer la commande
    await prisma.commande.delete({
      where: { id }
    })

    // Mettre à jour le montant total du chantier
    // @ts-ignore - Ignorer les erreurs de type ici
    const commandes = await prisma.commande.findMany({
      where: { chantierId: commande.chantierId }
    })
    
    // Calculer le montant total en additionnant uniquement les commandes avec statut VALIDEE
    const montantTotal = commandes
      .filter((cmd: any) => cmd.statut === 'VALIDEE')
      .reduce((sum: number, cmd: any) => sum + Number(cmd.total), 0)
    
    console.log('Montant total calculé après suppression:', montantTotal)
    
    await prisma.chantier.update({
      where: { chantierId: commande.chantierId },
      data: { budget: montantTotal }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la commande' },
      { status: 500 }
    )
  }
} 