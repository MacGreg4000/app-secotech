// Outils agent — rentabilité et coût matière.
//
// La saisie du coût matière passe volontairement par MCP plutôt que par un
// formulaire web : c'est justement parce que la saisie manuelle des dépenses ne
// se fait jamais en pratique que ce calcul existe. Dire « le carrelage de
// Diablotine coûte 22 €/m² » doit rester une phrase, pas un écran à remplir.

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier, clampLimit, eur } from './helpers'
import {
  CATEGORIES_MATERIAU,
  estCategorieMateriau,
  detecterCategorieMateriau,
  calculerCoutMatiereChantier,
  calculerRentabiliteChantier,
} from '@/lib/rentabilite/calcul'

// ─────────────────────────────────────────────────────────────────────────────
// Barème
// ─────────────────────────────────────────────────────────────────────────────

export const lireBaremeMateriau: ToolDefinition = {
  name: 'lire_bareme_materiau',
  description:
    'Barème des consommables par catégorie de pose (colle, joint, silicone, % de chute), ' +
    'utilisé pour estimer le coût matière. Des valeurs à zéro signifient que le barème ' +
    "n'est pas encore renseigné et que le coût estimé sera nul.",
  parameters: { type: 'object', properties: {} },
  execute: async () => {
    const baremes = await prisma.baremeMateriau.findMany({ orderBy: { categorie: 'asc' } })
    const nonRenseignes = baremes
      .filter(
        (b) =>
          b.ratioColleKgM2 === 0 &&
          b.prixColleKg === 0 &&
          b.ratioJointKgM2 === 0 &&
          b.prixJointKg === 0 &&
          b.pourcentageChute === 0 &&
          b.coutFixeM2 === 0
      )
      .map((b) => b.categorie)

    return {
      bareme: baremes.map((b) => ({
        categorie: b.categorie,
        colle: { ratioKgM2: b.ratioColleKgM2, prixKg: b.prixColleKg },
        joint: { ratioKgM2: b.ratioJointKgM2, prixKg: b.prixJointKg },
        silicone: { ratio: b.ratioSiliconeMl, prix: b.prixSiliconeMl },
        pourcentageChute: b.pourcentageChute,
        coutFixeParUnite: b.coutFixeM2,
      })),
      ...(nonRenseignes.length > 0
        ? {
            avertissement: `Catégorie(s) non renseignée(s) : ${nonRenseignes.join(', ')}. ` +
              'Le coût des consommables y sera nul.',
          }
        : {}),
    }
  },
}

export const definirBaremeMateriau: ToolDefinition = {
  name: 'definir_bareme_materiau',
  description:
    "Renseigne ou corrige le barème d'une catégorie de pose. Fusion partielle : seules les " +
    'valeurs fournies sont modifiées. Ces valeurs servent à TOUS les chantiers — les modifier ' +
    'change rétroactivement toutes les estimations de coût matière.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      categorie: { type: 'string', description: 'Catégorie visée', enum: [...CATEGORIES_MATERIAU] },
      ratioColleKgM2: { type: 'number', description: 'Kg de colle par m²' },
      prixColleKg: { type: 'number', description: 'Prix de la colle en € / kg' },
      ratioJointKgM2: { type: 'number', description: 'Kg de joint par m²' },
      prixJointKg: { type: 'number', description: 'Prix du joint en € / kg' },
      ratioSiliconeMl: { type: 'number', description: 'Silicone consommé par unité de quantité' },
      prixSiliconeMl: { type: 'number', description: 'Prix du silicone' },
      pourcentageChute: { type: 'number', description: '% de carrelage acheté en plus (coupes)' },
      coutFixeM2: {
        type: 'number',
        description:
          "Coût fixe par unité de quantité : clips et profilés de nivellement, " +
          "membrane d'étanchéité… (€ par m² ou par mètre linéaire selon la catégorie)",
      },
    },
    required: ['categorie'],
  },
  summarize: (args) => {
    const champs = Object.keys(args).filter((k) => k !== 'categorie')
    return champs.length === 0
      ? `Aucune valeur à modifier sur le barème ${String(args.categorie)}.`
      : `Modifier le barème « ${String(args.categorie)} » : ${champs.join(', ')} — ` +
          'ces valeurs s’appliquent à TOUS les chantiers.'
  },
  preview: async (args) => {
    const prep = await preparerBareme(args)
    if (prep.erreur) return { action: 'aucune', erreur: prep.erreur }
    return {
      action: 'mise_a_jour',
      categorie: args.categorie,
      avant: prep.avant,
      champsModifies: prep.data,
      avertissement: 'Le barème est global : toutes les estimations existantes seront recalculées.',
    }
  },
  execute: async (args) => {
    const prep = await preparerBareme(args)
    if (prep.erreur) return { erreur: prep.erreur }
    if (Object.keys(prep.data!).length === 0) {
      return { erreur: 'Aucune valeur à modifier : fournis au moins un champ.' }
    }
    const maj = await prisma.baremeMateriau.update({
      where: { categorie: String(args.categorie) },
      data: prep.data!,
    })
    return { succes: true, bareme: maj, champsModifies: Object.keys(prep.data!) }
  },
}

const CHAMPS_BAREME = [
  'ratioColleKgM2',
  'prixColleKg',
  'ratioJointKgM2',
  'prixJointKg',
  'ratioSiliconeMl',
  'prixSiliconeMl',
  'pourcentageChute',
  'coutFixeM2',
] as const

async function preparerBareme(
  args: Record<string, unknown>
): Promise<{ erreur?: string; data?: Record<string, number>; avant?: unknown }> {
  const categorie = String(args.categorie || '').trim().toUpperCase()
  if (!estCategorieMateriau(categorie)) {
    return { erreur: `Catégorie invalide. Valeurs : ${CATEGORIES_MATERIAU.join(', ')}.` }
  }
  const avant = await prisma.baremeMateriau.findUnique({ where: { categorie } })
  if (!avant) return { erreur: `Barème « ${categorie} » introuvable.` }

  const data: Record<string, number> = {}
  for (const champ of CHAMPS_BAREME) {
    if (args[champ] === undefined || args[champ] === null || String(args[champ]) === '') continue
    const n = Number(args[champ])
    if (!Number.isFinite(n) || n < 0) return { erreur: `${champ} doit être un nombre positif.` }
    if (champ === 'pourcentageChute' && n > 100) {
      return { erreur: 'pourcentageChute doit être compris entre 0 et 100.' }
    }
    data[champ] = n
  }
  return { data, avant }
}

// ─────────────────────────────────────────────────────────────────────────────
// Coût matière par ligne de commande
// ─────────────────────────────────────────────────────────────────────────────

export const analyserCoutMatiereChantier: ToolDefinition = {
  name: 'analyser_cout_matiere_chantier',
  description:
    "Détaille le coût matière estimé d'un chantier, ligne par ligne, à partir des quantités " +
    'déjà facturées au client. Signale les lignes non catégorisées ou sans prix d’achat, et ' +
    'propose une catégorie détectée automatiquement pour celles qui n’en ont pas.',
  parameters: {
    type: 'object',
    properties: { chantier: { type: 'string', description: 'Identifiant ou nom du chantier' } },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }

    const calcul = await calculerCoutMatiereChantier(res.value.id)

    // Suggestions pour les lignes facturées encore non catégorisées
    const dernierEtat = await prisma.etatAvancement.findFirst({
      where: { chantierId: res.value.id },
      orderBy: { numero: 'desc' },
      include: { lignes: { select: { ligneCommandeId: true, quantiteTotale: true, type: true } } },
    })
    const idsFactures = [
      ...new Set(
        (dernierEtat?.lignes || [])
          .filter((l) => l.type !== 'TITRE' && l.type !== 'SOUS_TITRE' && (l.quantiteTotale || 0) > 0)
          .map((l) => l.ligneCommandeId)
          .filter((v): v is number => !!v)
      ),
    ]
    const aCategoriser = await prisma.ligneCommande.findMany({
      where: { id: { in: idsFactures }, categorieMateriau: null },
      select: { id: true, article: true, description: true, unite: true },
    })

    return {
      chantier: res.value.nomChantier,
      etatNumero: calcul.etatNumero,
      coutMatiereTotal: calcul.coutMatiereTotal,
      detailParCategorie: calcul.detailParCategorie,
      lignes: calcul.lignes,
      avertissements: calcul.avertissements,
      lignesACategoriser: aCategoriser.map((l) => ({
        ligneCommandeId: l.id,
        article: l.article,
        description: l.description,
        unite: l.unite,
        categorieSuggeree: detecterCategorieMateriau(l.description),
      })),
    }
  },
}

export const definirCoutMatiereLigne: ToolDefinition = {
  name: 'definir_cout_matiere_ligne',
  description:
    "Définit la catégorie de pose et/ou le prix d'achat au m² sur une ou plusieurs lignes de " +
    'la commande d’un chantier. Cible les lignes par leur identifiant (voir ' +
    'analyser_cout_matiere_chantier) ou par leur numéro d’article. Fusion partielle : un champ ' +
    'non fourni reste inchangé.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      lignes: {
        type: 'array',
        description: 'Lignes à mettre à jour',
        items: {
          type: 'object',
          properties: {
            ligneCommandeId: { type: 'number', description: 'Identifiant de la ligne de commande' },
            article: { type: 'string', description: "Numéro d'article, si l'identifiant est inconnu" },
            categorieMateriau: {
              type: 'string',
              description: 'Catégorie de pose (null pour retirer)',
              enum: [...CATEGORIES_MATERIAU],
            },
            coutMatiereM2: { type: 'number', description: "Prix d'ACHAT du carrelage en € / m²" },
          },
        },
      },
    },
    required: ['chantier', 'lignes'],
  },
  summarize: async (args) => {
    const p = await preparerCoutLignes(args)
    if (p.erreur) return `Modification impossible : ${p.erreur}`
    const alerte =
      p.avertissements && p.avertissements.length > 0
        ? ` ⚠️ ${p.avertissements.length} incohérence(s) d'unité — voir le détail.`
        : ''
    return (
      `Mettre à jour ${p.maj!.length} ligne(s) de « ${p.chantierNom} » : ` +
      p.maj!.map((m) => `${m.article || m.id}${m.categorieMateriau ? ` → ${m.categorieMateriau}` : ''}` +
        `${m.coutMatiereM2 !== undefined ? ` à ${eur(m.coutMatiereM2)}/m²` : ''}`).join(', ') + alerte
    )
  },
  preview: async (args) => {
    const p = await preparerCoutLignes(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      action: 'mise_a_jour',
      chantier: p.chantierNom,
      lignes: p.maj,
      introuvables: p.introuvables,
      ...(p.avertissements && p.avertissements.length > 0
        ? { avertissements: p.avertissements }
        : {}),
    }
  },
  execute: async (args) => {
    const p = await preparerCoutLignes(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }

    let modifiees = 0
    for (const m of p.maj!) {
      const data: Record<string, unknown> = {}
      if (m.categorieMateriau !== undefined) data.categorieMateriau = m.categorieMateriau
      if (m.coutMatiereM2 !== undefined) data.coutMatiereM2 = m.coutMatiereM2
      if (Object.keys(data).length === 0) continue
      await prisma.ligneCommande.update({ where: { id: m.id }, data })
      modifiees++
    }

    return {
      succes: true,
      chantier: p.chantierNom,
      lignesModifiees: modifiees,
      introuvables: p.introuvables,
      ...(p.avertissements && p.avertissements.length > 0
        ? { avertissements: p.avertissements }
        : {}),
      prochaineEtape: 'Relance analyser_cout_matiere_chantier pour voir le coût recalculé.',
    }
  },
}

// ── Cohérence unité / catégorie ──────────────────────────────────────────────
// Le barème s'exprime par m² (SOL, MUR, ETANCHEITE) ou par mètre linéaire
// (PLINTHE). Catégoriser une ligne facturée en « Pièces » — un avaloir, un
// caniveau — appliquerait ces ratios à un NOMBRE D'OBJETS : le montant obtenu
// n'aurait aucun sens, et rien ne le signalerait.
// On avertit plutôt que de bloquer : c'est une donnée métier, pas une règle
// technique. L'avertissement apparaît dès le dryRun, avant toute écriture.
const UNITES_SURFACE = ['m2', 'm²']
const UNITES_LINEAIRES = ['m', 'ml', 'mct']

function normaliserUnite(u: string): string {
  return String(u || '')
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .replace(/²/g, '2')
    .trim()
}

function verifierUnite(categorie: string, unite: string): string | null {
  const u = normaliserUnite(unite)
  if (!u) return null
  const attenduLineaire = categorie === 'PLINTHE'
  const ok = attenduLineaire ? UNITES_LINEAIRES.includes(u) : UNITES_SURFACE.includes(u)
  if (ok) return null
  return attenduLineaire
    ? `unité « ${unite} » alors que ${categorie} attend un métré linéaire`
    : `unité « ${unite} » alors que ${categorie} attend des m²`
}

interface MajLigne {
  id: number
  article: string
  unite: string
  categorieMateriau?: string | null
  coutMatiereM2?: number
}

async function preparerCoutLignes(args: Record<string, unknown>): Promise<{
  erreur?: string
  candidats?: { id: string; nom: string }[]
  chantierNom?: string
  maj?: MajLigne[]
  introuvables?: string[]
  avertissements?: string[]
}> {
  const res = await resolveChantier(String(args.chantier || ''))
  if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }

  const demandes = Array.isArray(args.lignes) ? (args.lignes as Record<string, unknown>[]) : []
  if (demandes.length === 0) return { erreur: 'Aucune ligne fournie.' }

  // Toutes les lignes de commande du chantier (relation via Commande.chantierId = cuid)
  const lignesChantier = await prisma.ligneCommande.findMany({
    where: { commande: { chantierId: res.value.id } },
    select: { id: true, article: true, unite: true },
  })
  const parId = new Map<number, { article: string; unite: string }>(
    lignesChantier.map((l) => [l.id, { article: l.article, unite: l.unite }])
  )
  const parArticle = new Map<string, number[]>()
  for (const l of lignesChantier) {
    const k = (l.article || '').trim().toLowerCase()
    if (!k) continue
    parArticle.set(k, [...(parArticle.get(k) || []), l.id])
  }

  const maj: MajLigne[] = []
  const introuvables: string[] = []

  for (const d of demandes) {
    let id: number | undefined
    let article = ''

    if (d.ligneCommandeId !== undefined && d.ligneCommandeId !== null) {
      const n = Number(d.ligneCommandeId)
      if (parId.has(n)) {
        id = n
        article = parId.get(n)!.article
      } else {
        introuvables.push(`identifiant ${n} (absent de ce chantier)`)
        continue
      }
    } else if (d.article) {
      const k = String(d.article).trim().toLowerCase()
      const ids = parArticle.get(k) || []
      if (ids.length === 0) {
        introuvables.push(`article « ${String(d.article)} »`)
        continue
      }
      if (ids.length > 1) {
        introuvables.push(`article « ${String(d.article)} » (${ids.length} lignes portent ce numéro — précise l'identifiant)`)
        continue
      }
      id = ids[0]
      article = String(d.article)
    } else {
      introuvables.push('ligne sans ligneCommandeId ni article')
      continue
    }

    const entree: MajLigne = { id, article, unite: parId.get(id)?.unite || '' }

    if ('categorieMateriau' in d) {
      if (d.categorieMateriau === null) {
        entree.categorieMateriau = null
      } else {
        const c = String(d.categorieMateriau).trim().toUpperCase()
        if (!estCategorieMateriau(c)) {
          return { erreur: `Catégorie invalide « ${c} ». Valeurs : ${CATEGORIES_MATERIAU.join(', ')}.` }
        }
        entree.categorieMateriau = c
      }
    }
    if (d.coutMatiereM2 !== undefined && d.coutMatiereM2 !== null && String(d.coutMatiereM2) !== '') {
      const n = Number(d.coutMatiereM2)
      if (!Number.isFinite(n) || n < 0) return { erreur: "coutMatiereM2 doit être un nombre positif." }
      entree.coutMatiereM2 = n
    }

    maj.push(entree)
  }

  if (maj.length === 0) {
    return { erreur: `Aucune ligne exploitable. Non trouvées : ${introuvables.join(' ; ')}` }
  }

  const avertissements: string[] = []
  for (const m of maj) {
    if (!m.categorieMateriau) continue
    const souci = verifierUnite(m.categorieMateriau, m.unite)
    if (souci) {
      avertissements.push(`Ligne ${m.article || m.id} : ${souci}. Le montant calculé n'aurait pas de sens.`)
    }
  }

  return { chantierNom: res.value.nomChantier, maj, introuvables, avertissements }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rentabilité
// ─────────────────────────────────────────────────────────────────────────────

export const rentabiliteChantier: ToolDefinition = {
  name: 'rentabilite_chantier',
  description:
    "Rentabilité d'un chantier : chiffre d'affaires facturé, dépenses (manuelles, " +
    'sous-traitants, coût matière estimé), résultat net et marge en %. Même formule que ' +
    "l'écran « Résumé financier », augmentée du coût matière.",
  parameters: {
    type: 'object',
    properties: { chantier: { type: 'string', description: 'Identifiant ou nom du chantier' } },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }
    return calculerRentabiliteChantier(res.value.id, res.value.chantierId, res.value.nomChantier)
  },
}

export const chantiersSousMarge: ToolDefinition = {
  name: 'chantiers_sous_marge',
  description:
    'Classe les chantiers par marge croissante, pour repérer les moins rentables. ' +
    'Ne considère que les chantiers ayant déjà facturé quelque chose. Calcul potentiellement ' +
    'long : limiter le nombre de chantiers examinés.',
  parameters: {
    type: 'object',
    properties: {
      seuil: { type: 'number', description: 'Ne garder que les chantiers sous ce % de marge (optionnel)' },
      statut: {
        type: 'string',
        description: 'Filtrer par statut (défaut EN_COURS)',
        enum: ['EN_PREPARATION', 'A_VENIR', 'EN_COURS', 'TERMINE', 'TOUS'],
      },
      limit: { type: 'number', description: 'Nombre max de chantiers examinés (défaut 15, max 40)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 15, 40)
    const statut = args.statut ? String(args.statut).toUpperCase() : 'EN_COURS'

    const chantiers = await prisma.chantier.findMany({
      where: statut === 'TOUS' ? {} : { statut },
      select: { id: true, chantierId: true, nomChantier: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    const resultats = []
    for (const c of chantiers) {
      const r = await calculerRentabiliteChantier(c.id, c.chantierId, c.nomChantier)
      if (r.totalRevenue <= 0) continue // rien de facturé : marge non significative
      resultats.push(r)
    }

    resultats.sort((a, b) => a.margin - b.margin)
    const seuil = args.seuil !== undefined && args.seuil !== null ? Number(args.seuil) : null
    const filtres = seuil !== null ? resultats.filter((r) => r.margin < seuil) : resultats

    return {
      statut,
      chantiersExamines: chantiers.length,
      avecFacturation: resultats.length,
      ...(seuil !== null ? { seuil } : {}),
      chantiers: filtres.map((r) => ({
        chantier: r.nomChantier,
        chantierId: r.chantierId,
        caFacture: r.totalRevenue,
        depenses: r.totalExpenses,
        dontCoutMatiere: r.coutMatiere,
        resultatNet: r.netResult,
        margePourcent: r.margin,
      })),
      note:
        'Le coût matière est une estimation : il vaut 0 tant que le barème et les prix ' +
        "d'achat ne sont pas renseignés, ce qui SURESTIME la marge.",
    }
  },
}
