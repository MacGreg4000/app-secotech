import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { notifier } from '@/lib/services/notificationService'
import { readPortalSessionFromCookie, unauthorized } from '@/app/public/portail/auth'

// Statuts que le sous-traitant peut encore modifier lui-même.
// Une fois VALIDE ou PARTIELLEMENT_VALIDE, l'admin a traité le métré : on le verrouille.
const STATUTS_MODIFIABLES = ['BROUILLON', 'SOUMIS', 'REJETE']

interface MetreLineInput {
  ligneCommandeId?: number
  article?: string
  description?: string
  type?: string
  unite?: string
  prixUnitaire?: number
  quantite?: number
  estSupplement?: boolean
}

// GET: récupérer un métré du sous-traitant connecté (pour réouverture/édition)
export async function GET(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string; metreId: string }> }) {
  const { type, actorId, metreId } = await props.params
  if (type !== 'soustraitant') {
    return NextResponse.json({ error: 'Type non supporté' }, { status: 400 })
  }

  const session = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (!session || session.t !== 'SOUSTRAITANT' || session.id !== actorId) {
    return unauthorized()
  }

  try {
    const metre = await prisma.metreSoustraitant.findFirst({
      where: { id: metreId, soustraitantId: actorId },
      include: {
        lignes: { orderBy: { createdAt: 'asc' } },
        chantier: { select: { chantierId: true, nomChantier: true } },
        commande: { select: { id: true } },
      },
    })
    if (!metre) {
      return NextResponse.json({ error: 'Métré non trouvé' }, { status: 404 })
    }
    return NextResponse.json({ ...metre, modifiable: STATUTS_MODIFIABLES.includes(metre.statut) })
  } catch (error) {
    console.error('Erreur récupération métré portail:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH: mettre à jour un métré existant (brouillon ou déjà soumis, tant que non traité)
// Body: { statut?: 'BROUILLON'|'SOUMIS', commentaire?, piecesJointes?: string[], lignes: [...] }
export async function PATCH(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string; metreId: string }> }) {
  const { type, actorId, metreId } = await props.params
  if (type !== 'soustraitant') {
    return NextResponse.json({ error: 'Type non supporté' }, { status: 400 })
  }

  const session = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (!session || session.t !== 'SOUSTRAITANT' || session.id !== actorId) {
    return unauthorized()
  }

  try {
    const existing = await prisma.metreSoustraitant.findFirst({
      where: { id: metreId, soustraitantId: actorId },
      include: { chantier: { select: { chantierId: true, nomChantier: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Métré non trouvé' }, { status: 404 })
    }
    if (!STATUTS_MODIFIABLES.includes(existing.statut)) {
      return NextResponse.json({ error: 'Ce métré a été traité et ne peut plus être modifié' }, { status: 409 })
    }

    const body = await request.json()
    const { statut, commentaire, piecesJointes, lignes } = body as {
      statut?: string
      commentaire?: string | null
      piecesJointes?: string[]
      lignes: MetreLineInput[]
    }

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json({ error: 'lignes requis' }, { status: 400 })
    }

    const nouveauStatut = statut === 'BROUILLON' ? 'BROUILLON' : 'SOUMIS'
    const etaitSoumisAvant = existing.statut === 'SOUMIS'

    const metre = await prisma.$transaction(async (tx) => {
      await tx.metreLigne.deleteMany({ where: { metreId } })
      return tx.metreSoustraitant.update({
        where: { id: metreId },
        data: {
          statut: nouveauStatut,
          commentaire: commentaire ?? null,
          piecesJointes: Array.isArray(piecesJointes) ? piecesJointes : null,
          lignes: {
            create: lignes.map((l) => ({
              ligneCommandeId: l.ligneCommandeId ?? null,
              article: l.article || l.description || 'Sans article',
              description: l.description ?? '',
              type: l.type ?? 'QP',
              unite: l.unite ?? 'U',
              prixUnitaire: Number(l.prixUnitaire ?? 0),
              quantite: Number(l.quantite ?? 0),
              estSupplement: Boolean(l.estSupplement ?? false),
            })),
          },
        },
        include: {
          lignes: true,
          chantier: { select: { chantierId: true, nomChantier: true } },
          soustraitant: { select: { id: true, nom: true } },
        },
      })
    })

    // Notifier l'admin uniquement lors du passage effectif à SOUMIS (nouvelle soumission ou re-soumission après rejet)
    if (metre.statut === 'SOUMIS' && !etaitSoumisAvant) {
      await notifier({
        code: 'METRE_SOUMIS',
        rolesDestinataires: ['ADMIN', 'MANAGER'],
        metadata: {
          chantierId: metre.chantierId,
          chantierNom: metre.chantier.nomChantier,
          soustraitantId: metre.soustraitantId,
          soustraitantNom: metre.soustraitant.nom,
          metreId: metre.id,
        },
      })
    }

    return NextResponse.json(metre)
  } catch (error) {
    console.error('Erreur mise à jour métré portail:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
