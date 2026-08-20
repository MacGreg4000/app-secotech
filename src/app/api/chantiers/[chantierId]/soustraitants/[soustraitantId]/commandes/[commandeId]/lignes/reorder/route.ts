// Réordonnancement des lignes d'une commande sous-traitant.
//
// Endpoint dédié plutôt qu'un champ `ordre` ajouté au PUT d'une ligne : celui-ci
// recalcule le total de la ligne et celui de la commande à chaque appel. Déplacer
// une ligne parmi vingt déclencherait vingt recalculs financiers pour une simple
// question d'affichage. Ici on ne touche qu'à `ordre`, en une transaction.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
      select: { id: true },
    })
    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    const commandeId = parseInt(params.commandeId, 10)
    if (!Number.isInteger(commandeId)) {
      return NextResponse.json({ error: 'Commande invalide' }, { status: 400 })
    }

    const commande = await prisma.commandeSousTraitant.findFirst({
      where: { id: commandeId, chantierId: chantier.id, soustraitantId: params.soustraitantId },
      select: { id: true, estVerrouillee: true },
    })
    if (!commande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    // Même règle que l'ajout et la suppression de lignes : une commande validée
    // ne bouge plus. Elle a été envoyée au sous-traitant sous cette forme.
    if (commande.estVerrouillee) {
      return NextResponse.json(
        { error: 'Impossible de réordonner les lignes d’une commande validée' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    const recu: unknown[] = Array.isArray(body?.lignes) ? body.lignes : []
    if (recu.length === 0) {
      return NextResponse.json({ error: 'Aucun ordre fourni' }, { status: 400 })
    }

    // On n'accepte que des lignes appartenant à CETTE commande : l'ordre vient
    // du navigateur, il ne doit pas pouvoir toucher un autre dossier.
    const lignesCommande = await prisma.ligneCommandeSousTraitant.findMany({
      where: { commandeSousTraitantId: commandeId },
      select: { id: true },
    })
    const autorisees = new Set(lignesCommande.map((l) => l.id))

    const maj: { id: number; ordre: number }[] = []
    recu.forEach((entree, index) => {
      const id = Number((entree as { id?: unknown })?.id)
      if (!Number.isInteger(id) || !autorisees.has(id)) return
      // La position vient du RANG dans le tableau reçu, pas d'un `ordre` envoyé
      // par le client : cela garantit une suite 0..n-1 sans trou ni doublon.
      maj.push({ id, ordre: index })
    })

    if (maj.length !== autorisees.size) {
      return NextResponse.json(
        { error: 'La liste envoyée ne correspond pas aux lignes de la commande.' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      maj.map((m) =>
        prisma.ligneCommandeSousTraitant.update({
          where: { id: m.id },
          data: { ordre: m.ordre },
        })
      )
    )

    return NextResponse.json({ ok: true, lignesReordonnees: maj.length })
  } catch (error) {
    console.error('Erreur lors du réordonnancement des lignes:', error)
    return NextResponse.json({ error: 'Erreur lors du réordonnancement' }, { status: 500 })
  }
}
