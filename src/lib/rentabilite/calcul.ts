// Estimation du coût matière d'un chantier.
//
// Pourquoi ce calcul existe : le formulaire de dépenses demande six champs par
// ligne, donc en pratique les marchandises ne sont jamais encodées. Plutôt que
// de réduire la friction de saisie, on ESTIME le coût matière à partir de ce
// qui est déjà en base — les quantités réellement facturées au client.
//
// ── Sources de données (vérifiées, ≠ de celles du plan initial) ─────────────
// Le document de plan désignait `LigneMarche` / `LigneEtat` comme source. Ces
// tables sont MORTES : aucune requête Prisma dans tout src/, seules subsistent
// des déclarations de types orphelines. Bâtir dessus donnerait toujours zéro.
//
// Les vraies sources sont :
//   • `LigneCommande`            — le bordereau (article, unité, prix de vente)
//                                  et désormais categorieMateriau/coutMatiereM2
//   • `LigneEtatAvancement`      — état d'avancement CLIENT (et non
//                                  sous-traitant : c'est `EtatAvancement` qui
//                                  est le côté client, le plan les inversait).
//                                  `quantiteTotale` = cumul facturé à ce jour.
//   • lien : `LigneEtatAvancement.ligneCommandeId` (Int, sans clé étrangère)
//
// ── Principe ────────────────────────────────────────────────────────────────
// On part de l'état d'avancement le PLUS RÉCENT : ses lignes portent déjà le
// cumul (`quantiteTotale`), il est donc inutile — et faux — de sommer les états
// entre eux. Chaque ligne est rattachée à sa ligne de commande pour récupérer
// la catégorie et le prix d'achat, puis le barème de la catégorie s'applique.
//
// Le résultat est volontairement DÉTAILLÉ et porte ses avertissements : un coût
// sous-estimé parce que des lignes ne sont pas catégorisées doit se voir, pas
// se confondre avec un chantier peu coûteux.

import { prisma } from '@/lib/prisma/client'

/** Catégories de pose reconnues (colonne String, pas d'enum Prisma). */
export const CATEGORIES_MATERIAU = ['SOL', 'MUR', 'PLINTHE', 'ETANCHEITE'] as const
export type CategorieMateriau = (typeof CATEGORIES_MATERIAU)[number]

export function estCategorieMateriau(v: unknown): v is CategorieMateriau {
  return typeof v === 'string' && (CATEGORIES_MATERIAU as readonly string[]).includes(v)
}

/** Arrondi monétaire, même convention que le reste de l'application. */
function arrondi2(n: number): number {
  return Math.round(Number(n) * 100) / 100
}

export interface DetailLigneCoutMatiere {
  ligneCommandeId: number
  article: string
  description: string
  unite: string
  categorie: CategorieMateriau
  /** Quantité cumulée facturée au client à ce jour. */
  quantite: number
  coutMatiereM2: number
  pourcentageChute: number
  coutCarrelage: number
  coutColle: number
  coutJoint: number
  coutSilicone: number
  total: number
}

export interface ResultatCoutMatiere {
  chantierId: string
  /** Numéro de l'état d'avancement client servant de base au cumul. */
  etatNumero: number | null
  coutMatiereTotal: number
  detailParCategorie: Record<string, number>
  lignes: DetailLigneCoutMatiere[]
  /** Points qui minorent le résultat — à afficher, jamais à masquer. */
  avertissements: string[]
}

/** Champs de LigneCommande nécessaires au calcul. */
interface LigneCommandeMatiere {
  id: number
  article: string
  description: string
  unite: string
  type: string
  categorieMateriau: string | null
  coutMatiereM2: number | null
}

interface BaremeUtilisable {
  ratioColleKgM2: number
  prixColleKg: number
  ratioJointKgM2: number
  prixJointKg: number
  ratioSiliconeMl: number
  prixSiliconeMl: number
  pourcentageChute: number
}

const BAREME_VIDE: BaremeUtilisable = {
  ratioColleKgM2: 0,
  prixColleKg: 0,
  ratioJointKgM2: 0,
  prixJointKg: 0,
  ratioSiliconeMl: 0,
  prixSiliconeMl: 0,
  pourcentageChute: 0,
}

function baremeEstVide(b: BaremeUtilisable): boolean {
  return (
    b.ratioColleKgM2 === 0 &&
    b.prixColleKg === 0 &&
    b.ratioJointKgM2 === 0 &&
    b.prixJointKg === 0 &&
    b.ratioSiliconeMl === 0 &&
    b.prixSiliconeMl === 0 &&
    b.pourcentageChute === 0
  )
}

/**
 * Calcule le coût matière estimé d'un chantier.
 *
 * @param chantierCuid  `Chantier.id` (cuid) — c'est la clé utilisée par
 *                      EtatAvancement.chantierId, PAS le slug métier.
 *
 * Lecture seule : n'écrit jamais. Ne lève pas sur données manquantes ; renvoie
 * un total nul assorti d'avertissements explicites.
 */
export async function calculerCoutMatiereChantier(
  chantierCuid: string
): Promise<ResultatCoutMatiere> {
  const avertissements: string[] = []

  // 1. L'état d'avancement client le plus récent porte déjà les cumuls.
  const dernierEtat = await prisma.etatAvancement.findFirst({
    where: { chantierId: chantierCuid },
    orderBy: { numero: 'desc' },
    include: { lignes: true },
  })

  if (!dernierEtat || dernierEtat.lignes.length === 0) {
    return {
      chantierId: chantierCuid,
      etatNumero: dernierEtat?.numero ?? null,
      coutMatiereTotal: 0,
      detailParCategorie: {},
      lignes: [],
      avertissements: [
        dernierEtat
          ? "L'état d'avancement le plus récent ne contient aucune ligne."
          : "Aucun état d'avancement client : rien n'a encore été facturé, le coût matière est donc nul.",
      ],
    }
  }

  // 2. Barème par catégorie
  const baremes = await prisma.baremeMateriau.findMany()
  const baremeParCategorie = new Map<string, BaremeUtilisable>(
    baremes.map((b) => [
      b.categorie,
      {
        ratioColleKgM2: b.ratioColleKgM2,
        prixColleKg: b.prixColleKg,
        ratioJointKgM2: b.ratioJointKgM2,
        prixJointKg: b.prixJointKg,
        ratioSiliconeMl: b.ratioSiliconeMl,
        prixSiliconeMl: b.prixSiliconeMl,
        pourcentageChute: b.pourcentageChute,
      },
    ])
  )
  if (baremes.length === 0 || baremes.every((b) => baremeEstVide(baremeParCategorie.get(b.categorie)!))) {
    avertissements.push(
      "Le barème des consommables (colle, joint, silicone, chute) n'est pas renseigné : " +
        'seul le coût du carrelage est pris en compte.'
    )
  }

  // 3. Lignes de commande correspondantes (catégorie + prix d'achat).
  //    ligneCommandeId n'a PAS de clé étrangère : on filtre les valeurs nulles
  //    ou orphelines plutôt que de supposer l'intégrité.
  const idsLignesCommande = [
    ...new Set(dernierEtat.lignes.map((l) => l.ligneCommandeId).filter((v): v is number => !!v)),
  ]
  // Pas de garde sur un tableau vide : `in: []` ne renvoie rien, et le ternaire
  // ferait perdre le type inféré par Prisma.
  const lignesCommande = await prisma.ligneCommande.findMany({
    where: { id: { in: idsLignesCommande } },
    select: {
      id: true,
      article: true,
      description: true,
      unite: true,
      type: true,
      categorieMateriau: true,
      coutMatiereM2: true,
    },
  })
  // Map typée explicitement : l'inférence sur un tuple [number, objet] retombe
  // sinon sur unknown (findMany est bien typé, c'est le Map qui élargit).
  const ligneCommandeParId = new Map<number, LigneCommandeMatiere>(
    lignesCommande.map((l) => [l.id, l])
  )

  // 4. Calcul ligne à ligne
  const lignes: DetailLigneCoutMatiere[] = []
  const detailParCategorie: Record<string, number> = {}
  let nonCategorisees = 0
  let sansPrixAchat = 0

  for (const ligneEtat of dernierEtat.lignes) {
    // Les sections ne portent aucune quantité
    if (ligneEtat.type === 'TITRE' || ligneEtat.type === 'SOUS_TITRE') continue

    const quantite = ligneEtat.quantiteTotale || 0
    if (quantite <= 0) continue

    const lc = ligneEtat.ligneCommandeId ? ligneCommandeParId.get(ligneEtat.ligneCommandeId) : undefined
    const categorie = lc?.categorieMateriau
    if (!estCategorieMateriau(categorie)) {
      nonCategorisees++
      continue
    }
    const coutMatiereM2 = lc?.coutMatiereM2 ?? 0
    if (!coutMatiereM2) sansPrixAchat++

    const bareme = baremeParCategorie.get(categorie) ?? BAREME_VIDE

    const coutCarrelage = arrondi2(quantite * coutMatiereM2 * (1 + bareme.pourcentageChute / 100))
    const coutColle = arrondi2(quantite * bareme.ratioColleKgM2 * bareme.prixColleKg)
    const coutJoint = arrondi2(quantite * bareme.ratioJointKgM2 * bareme.prixJointKg)
    const coutSilicone = arrondi2(quantite * bareme.ratioSiliconeMl * bareme.prixSiliconeMl)
    const total = arrondi2(coutCarrelage + coutColle + coutJoint + coutSilicone)

    lignes.push({
      ligneCommandeId: lc!.id,
      article: lc!.article,
      description: lc!.description,
      unite: lc!.unite,
      categorie,
      quantite,
      coutMatiereM2,
      pourcentageChute: bareme.pourcentageChute,
      coutCarrelage,
      coutColle,
      coutJoint,
      coutSilicone,
      total,
    })
    detailParCategorie[categorie] = arrondi2((detailParCategorie[categorie] || 0) + total)
  }

  if (nonCategorisees > 0) {
    avertissements.push(
      `${nonCategorisees} ligne(s) facturée(s) sans catégorie matière : elles ne sont pas comptées. ` +
        'Le coût réel est donc supérieur à cette estimation.'
    )
  }
  if (sansPrixAchat > 0) {
    avertissements.push(
      `${sansPrixAchat} ligne(s) catégorisée(s) sans prix d'achat au m² : seuls les consommables sont comptés.`
    )
  }

  return {
    chantierId: chantierCuid,
    etatNumero: dernierEtat.numero,
    coutMatiereTotal: arrondi2(lignes.reduce((s, l) => s + l.total, 0)),
    detailParCategorie,
    lignes,
    avertissements,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Détection automatique de la catégorie à partir du descriptif
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise pour comparer sans accents ni casse. */
function normaliser(texte: string): string {
  return String(texte || '')
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
}

/**
 * Devine la catégorie d'une ligne d'après son libellé.
 * Ordre volontaire : les termes les plus spécifiques d'abord — « plinthe » et
 * « étanchéité » avant « sol »/« mur », sinon « plinthe pour carrelage de sol »
 * serait classée SOL.
 * Renvoie null en cas de doute : mieux vaut demander que se tromper.
 */
export function detecterCategorieMateriau(descriptif: string): CategorieMateriau | null {
  const t = normaliser(descriptif)
  if (!t) return null

  // Quincaillerie et accessoires : à écarter AVANT tout, sinon « siphon de sol »
  // ou « arrêt de chape » se retrouvent classés SOL et reçoivent colle et joint.
  if (
    /\b(siphon|avaloir|caniveau|grille|corniere|profil|profile|couvre-joint|entre-porte|entre-portes|tapis|arret de chape)\b/.test(
      t
    )
  ) {
    return null
  }

  if (/\b(plinthe|plinthes)\b/.test(t)) return 'PLINTHE'
  if (/etancheit|membrane|natte|sous-couche etanche|douche carrelee/.test(t)) return 'ETANCHEITE'
  // « mural » (masculin singulier) est la forme la plus fréquente des bordereaux
  if (/\b(mur|mural|murale|muraux|murales|faience|faiences)\b/.test(t)) return 'MUR'
  if (/\b(sol|sols|dalle|dalles|chape)\b/.test(t)) return 'SOL'

  return null
}
