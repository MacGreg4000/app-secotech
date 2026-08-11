// Coût matière estimé d'un chantier, pour l'écran « Résumé financier ».
//
// CardFinancialSummary est un composant client : il ne peut pas importer
// la librairie de calcul, qui utilise Prisma. D'où cette route, appelée comme
// les quatre autres qu'il consomme déjà.
//
// Même librairie que les outils MCP (src/lib/rentabilite/calcul.ts) : une seule
// formule, pas de duplication entre l'interface et l'agent.
//
// ── Deux niveaux d'accès, volontairement distincts ──────────────────────────
// Le TOTAL reste lisible par toute session : le résumé financier qui l'affiche
// montre déjà recettes, dépenses et marge à ces mêmes utilisateurs, et le
// restreindre casserait l'écran sans rien protéger de neuf.
// Le DÉTAIL (`saisie`) et l'ÉCRITURE exposent les prix d'achat fournisseur —
// la donnée la plus sensible du logiciel. Réservés à ADMIN/MANAGER.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import {
  CATEGORIE_AUCUNE,
  calculerCoutMatiereChantier,
  estCategorieMateriau,
  listerLignesSaisieCoutMatiere,
} from '@/lib/rentabilite/calcul'

export const dynamic = 'force-dynamic'

const ROLES_PRIX_ACHAT = ['ADMIN', 'MANAGER']

/** Résout le slug métier de l'URL vers le cuid utilisé par le calcul. */
async function resoudreChantier(chantierId: string) {
  return prisma.chantier.findUnique({ where: { chantierId }, select: { id: true } })
}

export async function GET(
  _request: Request,
  props: { params: Promise<{ chantierId: string }> }
) {
  const { chantierId } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const chantier = await resoudreChantier(chantierId)
    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    const resultat = await calculerCoutMatiereChantier(chantier.id)

    // Le détail de saisie n'accompagne la réponse que pour qui peut le voir.
    const peutSaisir = ROLES_PRIX_ACHAT.includes(session.user.role)
    if (!peutSaisir) {
      return NextResponse.json({ ...resultat, peutSaisir: false })
    }

    const saisie = await listerLignesSaisieCoutMatiere(chantier.id)
    return NextResponse.json({ ...resultat, peutSaisir: true, saisie })
  } catch (error) {
    console.error('Erreur calcul du coût matière:', error)
    // On renvoie un coût nul plutôt qu'une erreur : l'écran financier ne doit
    // jamais devenir inutilisable à cause de cette estimation additionnelle.
    return NextResponse.json({
      coutMatiereTotal: 0,
      detailParCategorie: {},
      lignes: [],
      avertissements: ['Le coût matière n’a pas pu être calculé.'],
      peutSaisir: false,
    })
  }
}

interface MajLigneEntree {
  ligneCommandeId?: unknown
  categorieMateriau?: unknown
  coutMatiereM2?: unknown
}

/**
 * Enregistre catégorie et prix d'achat pour un lot de lignes.
 *
 * Écrit UNIQUEMENT `categorieMateriau` et `coutMatiereM2` : deux colonnes
 * ajoutées pour la rentabilité, qu'aucun autre écran ne lit. Le bordereau
 * facturé au client n'est pas touché, y compris sur une commande verrouillée —
 * c'est précisément à ce moment-là qu'on connaît ses prix d'achat.
 */
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string }> }
) {
  const { chantierId } = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (!ROLES_PRIX_ACHAT.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Seuls les administrateurs et gestionnaires peuvent saisir les prix d’achat.' },
        { status: 403 }
      )
    }

    const chantier = await resoudreChantier(chantierId)
    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)

    // Pose seule : drapeau du chantier, indépendant des lignes. Traité d'abord
    // pour qu'un chantier sans aucune ligne facturée puisse quand même être
    // marqué comme tel.
    if (typeof body?.poseUniquement === 'boolean') {
      await prisma.chantier.update({
        where: { id: chantier.id },
        data: { poseUniquement: body.poseUniquement },
      })
    }

    const entrees: MajLigneEntree[] = Array.isArray(body?.lignes) ? body.lignes : []
    if (entrees.length === 0) {
      // Pas d'erreur si le drapeau vient d'être basculé : c'est un enregistrement
      // légitime, simplement sans ligne à mettre à jour.
      if (typeof body?.poseUniquement === 'boolean') {
        const resultat = await calculerCoutMatiereChantier(chantier.id)
        const saisie = await listerLignesSaisieCoutMatiere(chantier.id)
        return NextResponse.json({ lignesEnregistrees: 0, ...resultat, saisie })
      }
      return NextResponse.json({ error: 'Aucune ligne à enregistrer.' }, { status: 400 })
    }

    // Les identifiants viennent du client : on ne met à jour que des lignes
    // appartenant réellement à ce chantier, jamais celles d'un autre dossier.
    const lignesDuChantier = await prisma.ligneCommande.findMany({
      where: { commande: { chantierId: chantier.id } },
      select: { id: true },
    })
    const autorisees = new Set(lignesDuChantier.map((l) => l.id))

    const maj: { id: number; categorieMateriau: string | null; coutMatiereM2: number | null }[] = []
    for (const e of entrees) {
      const id = Number(e.ligneCommandeId)
      if (!Number.isInteger(id) || !autorisees.has(id)) continue

      const cat = e.categorieMateriau
      let categorieMateriau: string | null = null
      if (typeof cat === 'string' && cat !== '') {
        if (!estCategorieMateriau(cat) && cat !== CATEGORIE_AUCUNE) {
          return NextResponse.json(
            { error: `Catégorie inconnue : « ${cat} ».` },
            { status: 400 }
          )
        }
        categorieMateriau = cat
      }

      // Un prix absent, vide ou non numérique remet la colonne à null plutôt que
      // d'écrire 0 : « pas encore renseigné » et « gratuit » ne sont pas la même
      // chose, et l'avertissement « sans prix d'achat » doit continuer à sortir.
      const brut = e.coutMatiereM2
      const nombre = typeof brut === 'string' ? Number(brut.replace(',', '.')) : Number(brut)
      const coutMatiereM2 =
        brut === null || brut === undefined || brut === '' || !Number.isFinite(nombre) || nombre < 0
          ? null
          : Math.round(nombre * 100) / 100

      maj.push({ id, categorieMateriau, coutMatiereM2 })
    }

    if (maj.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne valide de ce chantier dans la requête.' },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      maj.map((m) =>
        prisma.ligneCommande.update({
          where: { id: m.id },
          data: { categorieMateriau: m.categorieMateriau, coutMatiereM2: m.coutMatiereM2 },
        })
      )
    )

    // On renvoie l'état recalculé : la modale affiche le nouveau total sans
    // avoir à redemander la route.
    const resultat = await calculerCoutMatiereChantier(chantier.id)
    const saisie = await listerLignesSaisieCoutMatiere(chantier.id)
    return NextResponse.json({ lignesEnregistrees: maj.length, ...resultat, saisie })
  } catch (error) {
    console.error('Erreur enregistrement du coût matière:', error)
    return NextResponse.json({ error: 'Erreur lors de l’enregistrement.' }, { status: 500 })
  }
}
