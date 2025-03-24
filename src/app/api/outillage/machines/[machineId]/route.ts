import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/outillage/machines/[machineId] - Récupère une machine spécifique
export async function GET(
  request: Request,
  { params }: { params: { machineId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const machine = await prisma.machine.findUnique({
      where: {
        id: params.machineId
      }
    })

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(machine)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la machine' },
      { status: 500 }
    )
  }
}

// PUT /api/outillage/machines/[machineId] - Met à jour une machine
export async function PUT(
  request: Request,
  { params }: { params: { machineId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Vérifier si la machine existe
    const existingMachine = await prisma.machine.findUnique({
      where: { id: params.machineId }
    })

    if (!existingMachine) {
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    // Si on change le statut de PRETE à autre chose, vérifier s'il y a des prêts en cours
    if (existingMachine.statut === 'PRETE' && body.statut !== 'PRETE') {
      const pretEnCours = await prisma.pret.findFirst({
        where: {
          machineId: params.machineId,
          statut: 'EN_COURS'
        }
      })

      if (pretEnCours) {
        return NextResponse.json(
          { error: 'Impossible de changer le statut : la machine est actuellement prêtée' },
          { status: 400 }
        )
      }
    }

    const updatedMachine = await prisma.machine.update({
      where: {
        id: params.machineId
      },
      data: {
        nom: body.nom,
        modele: body.modele,
        numeroSerie: body.numeroSerie || null,
        localisation: body.localisation,
        statut: body.statut,
        dateAchat: body.dateAchat ? new Date(body.dateAchat) : null,
        commentaire: body.commentaire || null
      }
    })

    return NextResponse.json(updatedMachine)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la machine' },
      { status: 500 }
    )
  }
}

// DELETE /api/outillage/machines/[machineId] - Supprime une machine
export async function DELETE(
  request: Request,
  { params }: { params: { machineId: string } }
) {
  try {
    console.log(`Tentative de suppression de la machine ${params.machineId}`)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Erreur: Session non trouvée')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log(`Utilisateur: ${session.user.email}, Rôle: ${session.user.role}`)

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== 'ADMIN') {
      console.log(`Tentative de suppression par un utilisateur non-admin: ${session.user.email}`)
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent supprimer des machines' },
        { status: 403 }
      )
    }

    // Vérifier si la machine existe
    const machine = await prisma.machine.findUnique({
      where: { id: params.machineId }
    })

    if (!machine) {
      console.log(`Erreur: Machine ${params.machineId} non trouvée`)
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    console.log(`Machine trouvée: ${machine.nom}, statut: ${machine.statut}`)

    // Vérifier si la machine a des prêts en cours
    const pretEnCours = await prisma.pret.findFirst({
      where: {
        machineId: params.machineId,
        statut: 'EN_COURS'
      }
    })

    if (pretEnCours) {
      console.log(`Erreur: Machine ${params.machineId} actuellement prêtée, prêt ID: ${pretEnCours.id}`)
      return NextResponse.json(
        { error: 'Impossible de supprimer la machine : elle est actuellement prêtée' },
        { status: 400 }
      )
    }

    // Vérifier s'il y a un historique de prêts pour cette machine
    const historiqueCount = await prisma.pret.count({
      where: {
        machineId: params.machineId
      }
    })

    if (historiqueCount > 0) {
      console.log(`Suppression d'une machine avec ${historiqueCount} prêts dans l'historique`)
      
      // Supprimer d'abord tous les prêts associés à cette machine
      try {
        await prisma.pret.deleteMany({
          where: {
            machineId: params.machineId
          }
        })
        console.log(`${historiqueCount} prêts associés à la machine ${params.machineId} ont été supprimés`)
      } catch (pretDeleteError: any) {
        console.error('Erreur lors de la suppression des prêts associés:', pretDeleteError)
        return NextResponse.json(
          { error: 'Erreur lors de la suppression des prêts associés à la machine' },
          { status: 500 }
        )
      }
    }

    try {
      // Supprimer la machine
      await prisma.machine.delete({
        where: {
          id: params.machineId
        }
      })
      
      console.log(`Machine ${params.machineId} supprimée avec succès par ${session.user.email}`)
      return new NextResponse(null, { status: 204 })
    } catch (deleteError: any) {
      console.error('Erreur spécifique lors de la suppression:', deleteError)
      
      // Vérifier si l'erreur est liée à des contraintes de clé étrangère
      if (deleteError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Impossible de supprimer cette machine car elle est référencée par d\'autres enregistrements' },
          { status: 400 }
        )
      }
      
      throw deleteError; // Relancer l'erreur pour qu'elle soit capturée par le bloc catch externe
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la machine:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la machine' },
      { status: 500 }
    )
  }
} 