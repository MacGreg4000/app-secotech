// Outils d'encodage d'un dossier : client → chantier → fiche → commande.
//
// Règles communes (voir src/lib/agent/tools/index.ts) :
//  - ne jamais throw : les erreurs sont des données
//  - création uniquement, jamais de suppression ni d'envoi
//  - écriture en Prisma direct (les routes REST correspondantes ont des
//    défauts documentés : pas de dédoublonnage, statuts en libellés français,
//    totaux non calculés…)

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { normalizeTva, normalizeNomEntreprise } from './helpers'

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
