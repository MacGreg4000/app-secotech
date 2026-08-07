// Outils d'encodage d'un dossier : client → chantier → fiche → commande.
//
// Règles communes (voir src/lib/agent/tools/index.ts) :
//  - ne jamais throw : les erreurs sont des données
//  - création uniquement, jamais de suppression ni d'envoi
//  - écriture en Prisma direct (les routes REST correspondantes ont des
//    défauts documentés : pas de dédoublonnage, statuts en libellés français,
//    totaux non calculés…)

import { prisma } from '@/lib/prisma/client'
import { generatePPSS } from '@/lib/ppss-generator'
import { notifier } from '@/lib/services/notificationService'
import { ToolDefinition } from '../types'
import { normalizeTva, normalizeNomEntreprise, resolveClient } from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// D1 — trouver_ou_creer_client
// ─────────────────────────────────────────────────────────────────────────────

interface ClientLite {
  id: string
  nom: string
  numeroTva: string | null
  email: string | null
}

type RechercheClient =
  | { statut: 'trouve'; client: ClientLite; methode: 'tva' | 'email' | 'nom' }
  | { statut: 'candidats'; candidats: ClientLite[] }
  | { statut: 'absent' }

/**
 * Recherche un client sans rien écrire.
 * Ordre de certitude décroissante : TVA (seul critère réellement
 * discriminant) → email → nom normalisé exact → nom approchant.
 */
async function rechercherClient(args: {
  nom?: string
  numeroTva?: string
  email?: string
}): Promise<RechercheClient> {
  // La table Client est petite (liste des donneurs d'ordre) : on la charge une
  // fois et on compare en mémoire, ce qui permet une normalisation correcte
  // (accents, formes juridiques, séparateurs de TVA) impossible en SQL simple.
  const tous = await prisma.client.findMany({
    select: { id: true, nom: true, numeroTva: true, email: true },
    take: 5000,
  })

  // 1. TVA normalisée
  const tva = normalizeTva(args.numeroTva)
  if (tva) {
    const parTva = tous.filter((c) => normalizeTva(c.numeroTva) === tva)
    if (parTva.length === 1) return { statut: 'trouve', client: parTva[0], methode: 'tva' }
    if (parTva.length > 1) return { statut: 'candidats', candidats: parTva }
  }

  // 2. Email exact
  const email = String(args.email || '').trim().toLowerCase()
  if (email) {
    const parEmail = tous.filter((c) => (c.email || '').trim().toLowerCase() === email)
    if (parEmail.length === 1) return { statut: 'trouve', client: parEmail[0], methode: 'email' }
    if (parEmail.length > 1) return { statut: 'candidats', candidats: parEmail }
  }

  // 3. Nom
  const nomNorm = normalizeNomEntreprise(args.nom)
  if (nomNorm) {
    const exacts = tous.filter((c) => normalizeNomEntreprise(c.nom) === nomNorm)
    if (exacts.length === 1) return { statut: 'trouve', client: exacts[0], methode: 'nom' }
    if (exacts.length > 1) return { statut: 'candidats', candidats: exacts }

    // Rapprochement souple : l'un contient l'autre (« ACME » ↔ « ACME Construction »)
    const proches = tous.filter((c) => {
      const n = normalizeNomEntreprise(c.nom)
      return n.length > 2 && (n.includes(nomNorm) || nomNorm.includes(n))
    })
    if (proches.length > 0) return { statut: 'candidats', candidats: proches.slice(0, 8) }
  }

  return { statut: 'absent' }
}

function decrireClient(c: ClientLite): string {
  return c.numeroTva ? `${c.nom} (${c.numeroTva})` : c.nom
}

export const trouverOuCreerClient: ToolDefinition = {
  name: 'trouver_ou_creer_client',
  description:
    "Trouve le client (entrepreneur général / donneur d'ordre) d'un dossier, par numéro de TVA, email ou nom. " +
    "Ne crée JAMAIS de doublon : si un client correspond de façon certaine, il est renvoyé tel quel. " +
    "Si des clients ressemblent sans certitude, la liste des candidats est renvoyée pour que l'utilisateur tranche. " +
    "La création n'a lieu que si creerSiAbsent vaut true. Utiliser dryRun d'abord pour voir ce qui se passerait.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      nom: { type: 'string', description: "Raison sociale du client, ex. « RECO+ » ou « Eloy Travaux SA »" },
      numeroTva: { type: 'string', description: 'Numéro de TVA, ex. BE0123456789 (critère le plus fiable)' },
      email: { type: 'string', description: 'Email de contact (optionnel)' },
      telephone: { type: 'string', description: 'Téléphone (optionnel)' },
      adresse: { type: 'string', description: 'Adresse postale (optionnel)' },
      creerSiAbsent: {
        type: 'boolean',
        description:
          "Défaut false. Si true et qu'aucun client certain n'existe, le client est créé. " +
          "Des candidats proches n'empêchent alors pas la création mais sont signalés.",
      },
    },
    required: ['nom'],
  },
  summarize: async (args) => {
    const recherche = await rechercherClient(args as { nom?: string; numeroTva?: string; email?: string })
    if (recherche.statut === 'trouve') {
      return `Utiliser le client existant « ${decrireClient(recherche.client)} » (aucune création).`
    }
    if (recherche.statut === 'candidats') {
      const liste = recherche.candidats.map(decrireClient).join(', ')
      return args.creerSiAbsent
        ? `Créer le client « ${String(args.nom)} » MALGRÉ des clients proches : ${liste}.`
        : `Ne rien créer : ${recherche.candidats.length} client(s) proche(s) à départager — ${liste}.`
    }
    return args.creerSiAbsent
      ? `Créer le nouveau client « ${String(args.nom)} »${args.numeroTva ? ` (TVA ${String(args.numeroTva)})` : ''}.`
      : `Aucun client trouvé pour « ${String(args.nom)} » — rien ne sera créé (creerSiAbsent absent).`
  },
  preview: async (args) => {
    const recherche = await rechercherClient(args as { nom?: string; numeroTva?: string; email?: string })
    if (recherche.statut === 'trouve') {
      return { action: 'aucune', raison: 'client existant', methode: recherche.methode, client: recherche.client }
    }
    if (recherche.statut === 'candidats') {
      return {
        action: args.creerSiAbsent ? 'creation_avec_avertissement' : 'aucune',
        candidats: recherche.candidats,
        avertissement: 'Des clients ressemblants existent — vérifier avant de créer un doublon.',
      }
    }
    return {
      action: args.creerSiAbsent ? 'creation' : 'aucune',
      raison: args.creerSiAbsent ? 'aucun client existant' : 'creerSiAbsent absent',
    }
  },
  execute: async (args) => {
    const nom = String(args.nom || '').trim()
    if (!nom) return { erreur: 'Le nom du client est requis.' }

    const recherche = await rechercherClient({
      nom,
      numeroTva: args.numeroTva ? String(args.numeroTva) : undefined,
      email: args.email ? String(args.email) : undefined,
    })

    // Match certain → on renvoie l'existant, jamais de doublon
    if (recherche.statut === 'trouve') {
      return {
        succes: true,
        cree: false,
        methode: recherche.methode,
        client: recherche.client,
        clientId: recherche.client.id,
      }
    }

    const creerSiAbsent = args.creerSiAbsent === true

    if (recherche.statut === 'candidats' && !creerSiAbsent) {
      return {
        erreur:
          `Plusieurs clients ressemblent à « ${nom} ». Demande à l'utilisateur lequel utiliser, ` +
          `puis rappelle avec son nom exact ou son id. Pour créer malgré tout : creerSiAbsent: true.`,
        candidats: recherche.candidats,
      }
    }

    if (!creerSiAbsent) {
      return {
        erreur: `Aucun client trouvé pour « ${nom} ». Rappelle avec creerSiAbsent: true pour le créer.`,
        candidats: [],
      }
    }

    // Création — même convention d'id que POST /api/clients
    const id = `CL-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const cree = await prisma.client.create({
      data: {
        id,
        nom,
        email: args.email ? String(args.email).trim() : null,
        telephone: args.telephone ? String(args.telephone).trim() : null,
        adresse: args.adresse ? String(args.adresse).trim() : null,
        numeroTva: args.numeroTva ? String(args.numeroTva).trim() : null,
        updatedAt: new Date(), // le modèle Client n'a pas @updatedAt
      },
      select: { id: true, nom: true, numeroTva: true, email: true },
    })

    return {
      succes: true,
      cree: true,
      client: cree,
      clientId: cree.id,
      ...(recherche.statut === 'candidats'
        ? { avertissement: 'Créé malgré des clients proches', candidatsIgnores: recherche.candidats }
        : {}),
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// D2 — creer_chantier
// ─────────────────────────────────────────────────────────────────────────────

/** Statuts réellement stockés en base (colonne String libre, pas d'enum Prisma). */
const STATUTS_CHANTIER = ['EN_PREPARATION', 'A_VENIR', 'EN_COURS', 'TERMINE'] as const
const TYPES_DUREE = ['CALENDRIER', 'OUVRABLE'] as const

const ALPHABET_SLUG = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Slug métier au format CH-<année>-<6 alphanumériques>, comme POST /api/chantiers. */
function genererSlugChantier(): string {
  let suffixe = ''
  for (let i = 0; i < 6; i++) {
    suffixe += ALPHABET_SLUG[Math.floor(Math.random() * ALPHABET_SLUG.length)]
  }
  return `CH-${new Date().getFullYear()}-${suffixe}`
}

/** Slug libre : chantierId est @unique et l'aléatoire ne garantit rien. */
async function genererSlugChantierUnique(): Promise<string | null> {
  for (let essai = 0; essai < 5; essai++) {
    const slug = genererSlugChantier()
    const existe = await prisma.chantier.findUnique({
      where: { chantierId: slug },
      select: { id: true },
    })
    if (!existe) return slug
  }
  return null
}

function parseDateOuNull(valeur: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (valeur === undefined || valeur === null || String(valeur).trim() === '') {
    return { ok: true, date: null }
  }
  const d = new Date(String(valeur))
  if (Number.isNaN(d.getTime())) return { ok: false }
  return { ok: true, date: d }
}

interface ValidationChantier {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  nomChantier?: string
  statut?: string
  typeDuree?: string
  dateDebut?: Date | null
  dureeEnJours?: number | null
  clientId?: string | null
  clientNom?: string | null
  contactId?: string | null
  numeroIdentification?: string | null
}

/** Valide et résout les arguments sans rien écrire (partagé preview/execute). */
async function validerChantier(args: Record<string, unknown>): Promise<ValidationChantier> {
  const nomChantier = String(args.nomChantier || '').trim()
  if (!nomChantier) return { erreur: 'Le nom du chantier est requis.' }

  // Statut : écrit en forme BASE. La route REST n'accepte que les libellés
  // français et retombe silencieusement sur EN_PREPARATION — d'où l'écriture directe.
  const statutBrut = args.statut ? String(args.statut).trim().toUpperCase() : 'EN_PREPARATION'
  if (!(STATUTS_CHANTIER as readonly string[]).includes(statutBrut)) {
    return { erreur: `Statut invalide « ${statutBrut} ». Valeurs acceptées : ${STATUTS_CHANTIER.join(', ')}.` }
  }

  const typeDuree = args.typeDuree ? String(args.typeDuree).trim().toUpperCase() : 'CALENDRIER'
  if (!(TYPES_DUREE as readonly string[]).includes(typeDuree)) {
    return { erreur: `typeDuree invalide « ${typeDuree} ». Valeurs acceptées : ${TYPES_DUREE.join(', ')}.` }
  }

  const dateParsee = parseDateOuNull(args.dateDebut)
  if (!dateParsee.ok) return { erreur: 'dateDebut invalide (format attendu AAAA-MM-JJ).' }

  let dureeEnJours: number | null = null
  if (args.dureeEnJours !== undefined && args.dureeEnJours !== null && String(args.dureeEnJours) !== '') {
    const n = Number(args.dureeEnJours)
    if (!Number.isFinite(n) || n < 0) return { erreur: 'dureeEnJours doit être un nombre positif.' }
    dureeEnJours = Math.floor(n)
  }

  // numeroIdentification est @unique : on pré-contrôle pour éviter un 500 opaque
  const numeroIdentification = args.numeroIdentification
    ? String(args.numeroIdentification).trim()
    : null
  if (numeroIdentification) {
    const conflit = await prisma.chantier.findUnique({
      where: { numeroIdentification },
      select: { chantierId: true, nomChantier: true },
    })
    if (conflit) {
      return {
        erreur:
          `La référence « ${numeroIdentification} » est déjà utilisée par le chantier ` +
          `« ${conflit.nomChantier} » (${conflit.chantierId}). Utilise une autre référence.`,
      }
    }
  }

  // Client : on accepte un id, ou à défaut un nom que l'on résout
  let clientId: string | null = null
  let clientNom: string | null = null
  if (args.clientId) {
    const ref = String(args.clientId).trim()
    const parId = await prisma.client.findUnique({ where: { id: ref }, select: { id: true, nom: true } })
    if (parId) {
      clientId = parId.id
      clientNom = parId.nom
    } else {
      const res = await resolveClient(ref)
      if (!res.ok || !res.value) {
        return { erreur: res.message || `Client introuvable : « ${ref} ».`, candidats: res.candidats }
      }
      clientId = res.value.id
      clientNom = res.value.nom
    }
  }

  let contactId: string | null = null
  if (args.contactId) {
    const ref = String(args.contactId).trim()
    const contact = await prisma.contact.findUnique({ where: { id: ref }, select: { id: true } })
    if (!contact) return { erreur: `Contact introuvable : « ${ref} ».` }
    contactId = contact.id
  }

  return {
    nomChantier,
    statut: statutBrut,
    typeDuree,
    dateDebut: dateParsee.date,
    dureeEnJours,
    clientId,
    clientNom,
    contactId,
    numeroIdentification,
  }
}

export const creerChantier: ToolDefinition = {
  name: 'creer_chantier',
  description:
    "Crée un nouveau chantier. L'identifiant du chantier (format CH-ANNEE-XXXXXX) est généré " +
    "automatiquement et ne doit PAS être fourni. La référence du marché va dans numeroIdentification " +
    "(unique : un doublon est refusé avec un message clair). Génère aussi le PPSS et notifie l'équipe. " +
    "Utiliser dryRun d'abord pour valider les données sans rien écrire.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      nomChantier: { type: 'string', description: 'Nom du chantier (obligatoire)' },
      clientId: {
        type: 'string',
        description:
          "Id du client obtenu via trouver_ou_creer_client. Un nom est toléré et sera résolu.",
      },
      numeroIdentification: {
        type: 'string',
        description: 'Référence du marché / numéro de dossier (doit être unique)',
      },
      adresseChantier: { type: 'string', description: 'Adresse du chantier' },
      villeChantier: { type: 'string', description: 'Ville du chantier' },
      dateDebut: { type: 'string', description: 'Date de début, format AAAA-MM-JJ' },
      dureeEnJours: { type: 'number', description: 'Durée prévue en jours' },
      typeDuree: {
        type: 'string',
        description: "CALENDRIER (défaut) ou OUVRABLE",
        enum: ['CALENDRIER', 'OUVRABLE'],
      },
      statut: {
        type: 'string',
        description: 'Défaut EN_PREPARATION',
        enum: ['EN_PREPARATION', 'A_VENIR', 'EN_COURS', 'TERMINE'],
      },
      contactId: { type: 'string', description: 'Id du contact client (optionnel)' },
    },
    required: ['nomChantier'],
  },
  summarize: async (args) => {
    const v = await validerChantier(args)
    if (v.erreur) return `Création impossible : ${v.erreur}`
    const client = v.clientNom ? ` pour ${v.clientNom}` : ''
    const ref = v.numeroIdentification ? ` (réf. ${v.numeroIdentification})` : ''
    const date = v.dateDebut ? `, début le ${v.dateDebut.toLocaleDateString('fr-FR')}` : ''
    return `Créer le chantier « ${v.nomChantier} »${client}${ref}${date} — statut ${v.statut}.`
  },
  preview: async (args) => {
    const v = await validerChantier(args)
    if (v.erreur) return { action: 'aucune', erreur: v.erreur, candidats: v.candidats }
    return {
      action: 'creation',
      chantier: {
        nomChantier: v.nomChantier,
        statut: v.statut,
        typeDuree: v.typeDuree,
        dateDebut: v.dateDebut,
        dureeEnJours: v.dureeEnJours,
        numeroIdentification: v.numeroIdentification,
        client: v.clientNom,
      },
      note: "L'identifiant CH-ANNEE-XXXXXX sera généré à l'exécution. Le PPSS sera généré automatiquement.",
    }
  },
  execute: async (args, ctx) => {
    const v = await validerChantier(args)
    if (v.erreur) return { erreur: v.erreur, candidats: v.candidats }

    const chantierId = await genererSlugChantierUnique()
    if (!chantierId) {
      return { erreur: "Impossible de générer un identifiant de chantier unique. Réessaie." }
    }

    const chantier = await prisma.chantier.create({
      data: {
        chantierId,
        nomChantier: v.nomChantier!,
        statut: v.statut!,
        typeDuree: v.typeDuree!,
        // on écrit dateDebut (dateCommencement est une colonne héritée inutilisée)
        dateDebut: v.dateDebut ?? null,
        dureeEnJours: v.dureeEnJours ?? null,
        numeroIdentification: v.numeroIdentification ?? null,
        adresseChantier: args.adresseChantier ? String(args.adresseChantier).trim() : null,
        villeChantier: args.villeChantier ? String(args.villeChantier).trim() : null,
        clientId: v.clientId ?? null,
        contactId: v.contactId ?? null,
        updatedAt: new Date(),
      },
      select: { id: true, chantierId: true, nomChantier: true, statut: true },
    })

    // Effets de bord de la route REST, reproduits explicitement.
    // Différence assumée : on REMONTE l'échec PPSS au lieu de l'avaler.
    let ppssErreur: string | undefined
    try {
      await generatePPSS(chantier.chantierId, ctx.userId)
    } catch (e) {
      ppssErreur = e instanceof Error ? e.message : 'échec inconnu'
      console.error('[agent] PPSS non généré pour', chantier.chantierId, e)
    }

    try {
      await notifier({
        code: 'CHANTIER_CREE',
        rolesDestinataires: ['ADMIN', 'MANAGER'],
        metadata: {
          chantierId: chantier.chantierId,
          chantierNom: chantier.nomChantier,
          userName: 'Agent MCP',
        },
      })
    } catch (e) {
      console.error('[agent] notification CHANTIER_CREE non envoyée:', e)
    }

    return {
      succes: true,
      // id (cuid) ET chantierId (slug) : les outils suivants ont besoin de l'un ou l'autre
      id: chantier.id,
      chantierId: chantier.chantierId,
      nomChantier: chantier.nomChantier,
      statut: chantier.statut,
      clientId: v.clientId ?? null,
      ...(ppssErreur ? { ppssErreur } : {}),
    }
  },
}
