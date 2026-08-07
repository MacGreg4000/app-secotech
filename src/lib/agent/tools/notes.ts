// Notes : bloc-notes personnel du dashboard + notes de chantier.
//
// POINT CLÉ — `UserNotes.userId` est @unique : une ligne par utilisateur, il
// n'existe aucun bloc-notes partagé. Or l'agent s'authentifie par clé d'API et
// écrit sous le compte de service `agent-mcp` (rôle BOT). Porté tel quel depuis
// le chatbot, il écrirait donc dans le bloc-notes du ROBOT — que personne ne
// voit jamais.
//
// D'où la résolution d'un utilisateur HUMAIN cible :
//   1. paramètre `utilisateur` (email ou User.id)
//   2. sinon variable d'environnement OPENBTP_AGENT_NOTES_USER_EMAIL
//   3. sinon erreur explicite (jamais de repli silencieux sur le compte agent)

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma/client'
import { ToolDefinition, ToolContext } from '../types'
import { resolveChantier } from './helpers'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  important: boolean
}

function parseTodos(raw: string | null): TodoItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

interface CibleNotes {
  erreur?: string
  userId?: string
  nom?: string
}

/** Résout l'utilisateur humain dont on manipule le bloc-notes. */
async function resoudreUtilisateurNotes(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<CibleNotes> {
  const ref =
    (args.utilisateur ? String(args.utilisateur).trim() : '') ||
    (process.env.OPENBTP_AGENT_NOTES_USER_EMAIL || '').trim()

  if (!ref) {
    return {
      erreur:
        "Impossible de savoir à quel utilisateur appartient ce bloc-notes. " +
        "Précise « utilisateur » (email ou identifiant), ou configure " +
        'OPENBTP_AGENT_NOTES_USER_EMAIL côté serveur.',
    }
  }

  const user = ref.includes('@')
    ? await prisma.user.findUnique({ where: { email: ref }, select: { id: true, name: true, email: true } })
    : await prisma.user.findUnique({ where: { id: ref }, select: { id: true, name: true, email: true } })

  if (!user) return { erreur: `Utilisateur introuvable : « ${ref} ».` }

  // Garde-fou : ne jamais écrire dans le bloc-notes du compte de service
  if (user.id === ctx.userId) {
    return {
      erreur:
        "Cible refusée : il s'agit du compte de service de l'agent, dont le bloc-notes " +
        "n'est affiché à personne. Indique un utilisateur humain.",
    }
  }

  return { userId: user.id, nom: user.name || user.email }
}

export const lireNotesDashboard: ToolDefinition = {
  name: 'lire_notes_dashboard',
  description:
    "Lit le bloc-notes personnel et la to-do list d'un utilisateur sur sa page d'accueil OpenBTP.",
  parameters: {
    type: 'object',
    properties: {
      utilisateur: {
        type: 'string',
        description:
          "Email ou identifiant de l'utilisateur. Facultatif si un utilisateur par défaut est configuré côté serveur.",
      },
    },
  },
  execute: async (args, ctx) => {
    const cible = await resoudreUtilisateurNotes(args, ctx)
    if (cible.erreur) return { erreur: cible.erreur }

    const notes = await prisma.userNotes.findUnique({
      where: { userId: cible.userId! },
      select: { content: true, todos: true, updatedAt: true },
    })
    if (!notes) return { utilisateur: cible.nom, notes: '', todos: [], info: 'Bloc-notes vide.' }

    return {
      utilisateur: cible.nom,
      notes: stripHtml(notes.content || ''),
      todos: parseTodos(notes.todos).map((t) => ({
        texte: t.text,
        fait: t.completed,
        important: t.important,
      })),
      derniereModification: notes.updatedAt,
    }
  },
}

export const ajouterNoteDashboard: ToolDefinition = {
  name: 'ajouter_note_dashboard',
  description:
    "Ajoute une ligne au bloc-notes personnel de la page d'accueil, sans effacer l'existant.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      texte: { type: 'string', description: 'Le texte à ajouter au bloc-notes' },
      utilisateur: {
        type: 'string',
        description: "Email ou identifiant de l'utilisateur (facultatif si configuré côté serveur)",
      },
    },
    required: ['texte'],
  },
  summarize: (args) => `Ajouter au bloc-notes de la page d'accueil : « ${String(args.texte)} »`,
  preview: async (args, ctx) => {
    const cible = await resoudreUtilisateurNotes(args, ctx)
    if (cible.erreur) return { action: 'aucune', erreur: cible.erreur }
    return { action: 'ajout', destinataire: cible.nom, texte: String(args.texte || '').trim() }
  },
  execute: async (args, ctx) => {
    const texte = String(args.texte || '').trim()
    if (!texte) return { erreur: 'Texte vide.' }
    const cible = await resoudreUtilisateurNotes(args, ctx)
    if (cible.erreur) return { erreur: cible.erreur }

    const existing = await prisma.userNotes.findUnique({
      where: { userId: cible.userId! },
      select: { content: true },
    })
    const current = existing?.content || ''
    const escaped = texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Le bloc-notes stocke du HTML (éditeur riche) — on ajoute proprement à la suite.
    // L'update ne touche QUE `content` : stickyNotes, todos et mode sont préservés.
    const content = current ? `${current}<br>• ${escaped}` : `• ${escaped}`

    await prisma.userNotes.upsert({
      where: { userId: cible.userId! },
      update: { content },
      create: { userId: cible.userId!, content },
    })
    return { succes: true, destinataire: cible.nom }
  },
}

export const ajouterTodoDashboard: ToolDefinition = {
  name: 'ajouter_todo_dashboard',
  description: "Ajoute une tâche à la to-do list personnelle de la page d'accueil.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      texte: { type: 'string', description: 'Le texte de la tâche' },
      important: { type: 'boolean', description: 'Marquer comme important (défaut false)' },
      utilisateur: {
        type: 'string',
        description: "Email ou identifiant de l'utilisateur (facultatif si configuré côté serveur)",
      },
    },
    required: ['texte'],
  },
  summarize: (args) =>
    `Ajouter à la to-do list : « ${String(args.texte)} »${args.important ? ' (important)' : ''}`,
  preview: async (args, ctx) => {
    const cible = await resoudreUtilisateurNotes(args, ctx)
    if (cible.erreur) return { action: 'aucune', erreur: cible.erreur }
    return {
      action: 'ajout',
      destinataire: cible.nom,
      tache: String(args.texte || '').trim(),
      important: args.important === true,
    }
  },
  execute: async (args, ctx) => {
    const texte = String(args.texte || '').trim()
    if (!texte) return { erreur: 'Texte de la tâche vide.' }
    const cible = await resoudreUtilisateurNotes(args, ctx)
    if (cible.erreur) return { erreur: cible.erreur }

    const existing = await prisma.userNotes.findUnique({
      where: { userId: cible.userId! },
      select: { todos: true },
    })
    const todos = parseTodos(existing?.todos ?? null)
    todos.push({ id: randomUUID(), text: texte, completed: false, important: args.important === true })

    await prisma.userNotes.upsert({
      where: { userId: cible.userId! },
      update: { todos: JSON.stringify(todos) },
      create: { userId: cible.userId!, content: '', todos: JSON.stringify(todos) },
    })
    return { succes: true, destinataire: cible.nom, nombreTodos: todos.length }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Note de chantier (journal de bord)
// ─────────────────────────────────────────────────────────────────────────────

export const creerNoteChantier: ToolDefinition = {
  name: 'creer_note_chantier',
  description:
    "Ajoute une note au journal de bord d'un chantier. La note apparaîtra signée « Agent MCP ».",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      contenu: { type: 'string', description: 'Le contenu de la note' },
    },
    required: ['chantier', 'contenu'],
  },
  summarize: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    const nom = res.ok && res.value ? res.value.nomChantier : String(args.chantier)
    return `Ajouter une note au chantier « ${nom} » : « ${String(args.contenu)} »`
  },
  preview: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return { action: 'aucune', erreur: res.message, candidats: res.candidats }
    return { action: 'creation', chantier: res.value.nomChantier, contenu: String(args.contenu || '').trim() }
  },
  execute: async (args, ctx) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }
    const contenu = String(args.contenu || '').trim()
    if (!contenu) return { erreur: 'Le contenu de la note est vide.' }

    const note = await prisma.note.create({
      data: {
        chantierId: res.value.chantierId, // Note → Chantier.chantierId (slug)
        contenu,
        createdBy: ctx.userId,
        updatedAt: new Date(), // le modèle Note n'a pas @updatedAt
      },
      select: { id: true },
    })
    return { succes: true, chantier: res.value.nomChantier, noteId: note.id }
  },
}
