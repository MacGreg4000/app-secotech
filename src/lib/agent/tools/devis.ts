// Devis CLIENT direct (pas d'avenant — la conversion devis → avenant est déjà
// gérée dans l'application, hors périmètre ici).
//
// Comme pour les commandes, POST /api/devis n'a pas de calcul serveur : les
// montants sont pris tels quels dans le corps de la requête. On les calcule
// donc nous-mêmes, en miroir EXACT de `calculerTotaux` (écran devis — DIFFÉRENT
// de `recalculerTotaux` des commandes) :
//   src/app/(dashboard)/devis/nouveau/page.tsx:230
//
//   lignesCalculables = lignes.filter(l => l.type === 'QP')   ← inclusion stricte,
//     pas une exclusion de TITRE/SOUS_TITRE comme pour les commandes (le devis
//     n'a que QP/TITRE/SOUS_TITRE, pas de QF/FF)
//   totalHT             = Σ ligne.total (lignes QP uniquement)
//   montantRemise        = totalHT * remiseGlobale / 100
//   totalHTApresRemise   = totalHT - montantRemise
//   totalTVA             = totalHTApresRemise * tauxTVA / 100
//   totalTTC             = totalHTApresRemise + totalTVA
//
// Piège vérifié dans le code : le champ stocké `montantHT` est bien
// `totalHTApresRemise` (HT APRÈS remise globale), pas le HT brut.

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveClient, arrondi2, eur } from './helpers'

const TYPES_LIGNE_DEVIS = ['QP', 'TITRE', 'SOUS_TITRE'] as const
const TAUX_TVA_AUTORISES = [0, 6, 21] as const
const MAX_LIGNES = 300

interface LigneDevisNormalisee {
  ordre: number
  type: string
  article: string | null
  description: string | null
  unite: string
  quantite: number
  prixUnitaire: number
  remise: number
  total: number
}

function normaliserLignesDevis(
  brutes: unknown[]
): { lignes?: LigneDevisNormalisee[]; erreur?: string } {
  const lignes: LigneDevisNormalisee[] = []

  for (let i = 0; i < brutes.length; i++) {
    const l = (brutes[i] || {}) as Record<string, unknown>
    const type = l.type ? String(l.type).trim().toUpperCase() : 'QP'
    if (!(TYPES_LIGNE_DEVIS as readonly string[]).includes(type)) {
      return { erreur: `Ligne ${i + 1} : type « ${type} » invalide. Valeurs : ${TYPES_LIGNE_DEVIS.join(', ')}.` }
    }
    const estSection = type === 'TITRE' || type === 'SOUS_TITRE'

    if (estSection) {
      lignes.push({
        ordre: i + 1,
        type,
        article: String(l.article || (type === 'TITRE' ? 'ARTICLE_TITRE' : 'ARTICLE_SOUS_TITRE')).trim(),
        description: String(l.description || (type === 'TITRE' ? 'TITRE DE SECTION' : 'Sous-titre de section')).trim(),
        unite: '',
        quantite: 0,
        prixUnitaire: 0,
        remise: 0,
        total: 0,
      })
      continue
    }

    const description = String(l.description || '').trim()
    if (!description) return { erreur: `Ligne ${i + 1} : description obligatoire.` }

    const quantite = Number(l.quantite ?? 0)
    const prixUnitaire = Number(l.prixUnitaire ?? 0)
    const remise = Number(l.remise ?? 0)
    if (!Number.isFinite(quantite) || !Number.isFinite(prixUnitaire) || !Number.isFinite(remise)) {
      return { erreur: `Ligne ${i + 1} : quantite, prixUnitaire et remise doivent être numériques.` }
    }
    if (quantite < 0 || prixUnitaire < 0) {
      return { erreur: `Ligne ${i + 1} : quantite et prixUnitaire ne peuvent pas être négatifs.` }
    }
    if (remise < 0 || remise > 100) {
      return { erreur: `Ligne ${i + 1} : remise doit être comprise entre 0 et 100.` }
    }

    const sousTotal = quantite * prixUnitaire
    lignes.push({
      ordre: i + 1,
      type: 'QP',
      article: l.article ? String(l.article).trim() : null,
      description,
      unite: l.unite ? String(l.unite).trim() : 'Pièces',
      quantite,
      prixUnitaire,
      remise,
      total: arrondi2(sousTotal - (sousTotal * remise) / 100),
    })
  }

  return { lignes }
}

interface TotauxDevis {
  totalHT: number
  montantRemise: number
  totalHTApresRemise: number
  totalTVA: number
  totalTTC: number
}

/** Miroir exact de calculerTotaux (écran devis). */
function calculerTotauxDevis(
  lignes: LigneDevisNormalisee[],
  tauxTVA: number,
  remiseGlobale: number
): TotauxDevis {
  const totalHT = arrondi2(lignes.filter((l) => l.type === 'QP').reduce((s, l) => s + l.total, 0))
  const montantRemise = arrondi2(totalHT * (remiseGlobale / 100))
  const totalHTApresRemise = arrondi2(totalHT - montantRemise)
  const totalTVA = arrondi2(totalHTApresRemise * (tauxTVA / 100))
  const totalTTC = arrondi2(totalHTApresRemise + totalTVA)
  return { totalHT, montantRemise, totalHTApresRemise, totalTVA, totalTTC }
}

/** Numéro séquentiel DEV-ANNÉE-XXXX, avec repli en cas de collision concurrente. */
async function genererNumeroDevis(): Promise<string> {
  const annee = new Date().getFullYear()
  for (let essai = 0; essai < 5; essai++) {
    const dernier = await prisma.devis.findFirst({
      where: { numeroDevis: { startsWith: `DEV-${annee}-` } },
      orderBy: { numeroDevis: 'desc' },
      select: { numeroDevis: true },
    })
    const dernierNumero = dernier ? parseInt(dernier.numeroDevis.split('-')[2], 10) || 0 : 0
    const candidat = `DEV-${annee}-${String(dernierNumero + 1 + essai).padStart(4, '0')}`
    const existe = await prisma.devis.findUnique({ where: { numeroDevis: candidat }, select: { id: true } })
    if (!existe) return candidat
  }
  // Repli improbable : horodatage pour garantir l'unicité
  return `DEV-${annee}-${Date.now().toString().slice(-6)}`
}

interface PreparationDevis {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  clientId?: string
  clientNom?: string
  reference?: string | null
  tauxTVA?: number
  remiseGlobale?: number
  observations?: string | null
  lignes?: LigneDevisNormalisee[]
  totaux?: TotauxDevis
}

async function preparerDevis(args: Record<string, unknown>): Promise<PreparationDevis> {
  const res = await resolveClient(String(args.client || ''))
  if (!res.ok || !res.value) return { erreur: res.message || 'Client introuvable.', candidats: res.candidats }

  const brutes = Array.isArray(args.lignes) ? (args.lignes as unknown[]) : null
  if (!brutes || brutes.length === 0) return { erreur: 'Au moins une ligne est requise.' }
  if (brutes.length > MAX_LIGNES) return { erreur: `Trop de lignes (${brutes.length}). Maximum ${MAX_LIGNES}.` }

  const norm = normaliserLignesDevis(brutes)
  if (norm.erreur) return { erreur: norm.erreur }
  if (!norm.lignes!.some((l) => l.type === 'QP')) {
    return { erreur: 'Le devis doit contenir au moins une ligne chiffrée (type QP).' }
  }

  let tauxTVA = 21
  if (args.tauxTVA !== undefined && args.tauxTVA !== null && String(args.tauxTVA) !== '') {
    const t = Number(args.tauxTVA)
    if (!(TAUX_TVA_AUTORISES as readonly number[]).includes(t)) {
      return { erreur: `tauxTVA invalide (${t}). Valeurs acceptées : ${TAUX_TVA_AUTORISES.join(', ')}.` }
    }
    tauxTVA = t
  }

  let remiseGlobale = 0
  if (args.remiseGlobale !== undefined && args.remiseGlobale !== null && String(args.remiseGlobale) !== '') {
    const r = Number(args.remiseGlobale)
    if (!Number.isFinite(r) || r < 0 || r > 100) {
      return { erreur: 'remiseGlobale doit être un nombre entre 0 et 100.' }
    }
    remiseGlobale = r
  }

  return {
    clientId: res.value.id,
    clientNom: res.value.nom,
    reference: args.reference ? String(args.reference).trim() : null,
    tauxTVA,
    remiseGlobale,
    observations: args.observations ? String(args.observations).trim() : null,
    lignes: norm.lignes,
    totaux: calculerTotauxDevis(norm.lignes!, tauxTVA, remiseGlobale),
  }
}

export const creerDevis: ToolDefinition = {
  name: 'creer_devis',
  description:
    'Crée un devis CLIENT (pas un avenant de chantier) en BROUILLON, avec ses lignes chiffrées. ' +
    'Les montants (HT, TVA, TTC) sont TOUJOURS calculés côté serveur — ne pas les fournir. ' +
    'Le numéro (DEV-ANNÉE-XXXX) est généré automatiquement. Pour convertir un devis accepté en ' +
    "commande ou en avenant de chantier, utiliser l'application. Utiliser dryRun pour vérifier " +
    "les totaux avant d'écrire.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      client: { type: 'string', description: 'Identifiant (CL-…) ou nom du client' },
      reference: { type: 'string', description: 'Référence libre du devis (optionnel)' },
      tauxTVA: {
        type: 'number',
        description: 'Taux de TVA en %. Défaut 21. 6 % pour rénovation de logement ancien, 0 % si exonéré.',
        enum: [0, 6, 21],
      },
      remiseGlobale: { type: 'number', description: 'Remise globale en % appliquée au total HT (défaut 0)' },
      observations: { type: 'string', description: 'Observations libres (optionnel)' },
      lignes: {
        type: 'array',
        description:
          'Lignes du devis, dans l’ordre. TITRE et SOUS_TITRE structurent le document et sont ' +
          'exclues des totaux ; au moins une ligne QP est requise.',
        items: {
          type: 'object',
          properties: {
            article: { type: 'string', description: "Référence de l'article (optionnel)" },
            description: { type: 'string', description: 'Libellé du poste (obligatoire hors sections)' },
            type: { type: 'string', description: 'QP (défaut), TITRE ou SOUS_TITRE', enum: [...TYPES_LIGNE_DEVIS] },
            unite: { type: 'string', description: "Unité (m², m³, pièce…). Défaut « Pièces »" },
            quantite: { type: 'number', description: 'Quantité' },
            prixUnitaire: { type: 'number', description: 'Prix unitaire' },
            remise: { type: 'number', description: 'Remise en % sur cette ligne uniquement (défaut 0)' },
          },
          required: ['description'],
        },
      },
    },
    required: ['client', 'lignes'],
  },
  summarize: async (args) => {
    const p = await preparerDevis(args)
    if (p.erreur) return `Création impossible : ${p.erreur}`
    const t = p.totaux!
    const nbPostes = p.lignes!.filter((l) => l.type === 'QP').length
    const remise = t.montantRemise > 0 ? ` − remise ${p.remiseGlobale}% (${eur(t.montantRemise)})` : ''
    return (
      `Créer un devis BROUILLON pour « ${p.clientNom} » : ${nbPostes} poste(s), ` +
      `HT ${eur(t.totalHT)}${remise}, TVA ${p.tauxTVA}% ${eur(t.totalTVA)}, TTC ${eur(t.totalTTC)}.`
    )
  },
  preview: async (args) => {
    const p = await preparerDevis(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      action: 'creation',
      client: p.clientNom,
      statut: 'BROUILLON',
      reference: p.reference,
      tauxTVA: p.tauxTVA,
      remiseGlobale: p.remiseGlobale,
      nbLignes: p.lignes!.length,
      totaux: p.totaux,
      note: 'Montants calculés côté serveur — à comparer au devis source avant exécution.',
    }
  },
  execute: async (args, ctx) => {
    const p = await preparerDevis(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    const t = p.totaux!

    const numeroDevis = await genererNumeroDevis()
    const dateValidite = new Date()
    dateValidite.setDate(dateValidite.getDate() + 30)

    const devis = await prisma.$transaction(async (tx) => {
      const d = await tx.devis.create({
        data: {
          numeroDevis,
          typeDevis: 'DEVIS',
          reference: p.reference,
          clientId: p.clientId!,
          chantierId: null,
          dateValidite,
          observations: p.observations,
          tauxTVA: p.tauxTVA!,
          remiseGlobale: p.remiseGlobale!,
          montantHT: t.totalHTApresRemise,
          montantTVA: t.totalTVA,
          montantTTC: t.totalTTC,
          createdBy: ctx.userId,
        },
        select: { id: true, numeroDevis: true },
      })

      await tx.ligneDevis.createMany({
        data: p.lignes!.map((l) => ({
          devisId: d.id,
          ordre: l.ordre,
          type: l.type,
          article: l.article,
          description: l.description,
          unite: l.unite,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          remise: l.remise,
          total: l.total,
        })),
      })

      return d
    })

    return {
      succes: true,
      devisId: devis.id,
      numeroDevis: devis.numeroDevis,
      client: p.clientNom,
      statut: 'BROUILLON',
      totaux: t,
      prochaineEtape:
        "Le devis est en brouillon. Envoie-le au client depuis l'application ; une fois accepté, " +
        'il peut y être converti en commande ou en avenant de chantier.',
    }
  },
}
