// Authentification des appels agent (MCP) par clé d'API.
//
// Principes :
//  - le secret en clair n'est JAMAIS stocké côté serveur, seulement son SHA-256
//  - fail-closed : si aucune clé n'est configurée, tout est refusé
//    (contrairement à src/app/api/reports/monthly-etats/route.ts, qui laisse
//     passer quand CRON_SECRET est absent — motif volontairement non reproduit)
//  - la clé se résout vers un VRAI User : les écritures en ont besoin
//    (generatePPSS, createdBy, notifications…)
//  - on ne journalise jamais la clé, uniquement son label
//
// Configuration (.env) :
//   OPENBTP_AGENT_KEYS="claude-code:<sha256hex>,claude-desktop:<sha256hex>"
//   OPENBTP_AGENT_USER_EMAIL="agent-mcp@secotech.fr"   (optionnel)
//
// Générer une clé + son hash :
//   node -e "const c=require('crypto');const k=c.randomBytes(32).toString('hex');console.log('clé =',k);console.log('hash=',c.createHash('sha256').update(k).digest('hex'))"

import { createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma/client'

export interface AgentIdentity {
  userId: string
  role: string
  /** Label de la clé utilisée — sûr à journaliser. */
  keyLabel: string
}

/** Identifiant fixe de l'utilisateur de service (User.id n'a pas de @default). */
const AGENT_USER_ID = 'agent-mcp'
const DEFAULT_AGENT_EMAIL = 'agent-mcp@secotech.fr'
/** Non-hash bcrypt → bcrypt.compare renvoie toujours false : connexion impossible. */
const DISABLED_PASSWORD = '!disabled-no-login'

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

interface ConfiguredKey {
  label: string
  hash: string
}

/** Parse OPENBTP_AGENT_KEYS ("label:sha256hex,…"). Entrées invalides ignorées. */
function parseConfiguredKeys(): ConfiguredKey[] {
  const raw = process.env.OPENBTP_AGENT_KEYS || ''
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      // le label peut contenir des ':' — on coupe au dernier
      const idx = entry.lastIndexOf(':')
      if (idx <= 0) return null
      const label = entry.slice(0, idx).trim()
      const hash = entry.slice(idx + 1).trim().toLowerCase()
      if (!label || !/^[0-9a-f]{64}$/.test(hash)) return null
      return { label, hash }
    })
    .filter((k): k is ConfiguredKey => k !== null)
}

/** Comparaison en temps constant de deux hashes hexadécimaux. */
function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length === 0 || bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Récupère (ou crée à la volée) l'utilisateur de service.
 * Rôle BOT : moindre privilège, et déjà exclu des listes par /api/users.
 */
export async function getOrCreateAgentUser(): Promise<{ id: string; role: string }> {
  const email = process.env.OPENBTP_AGENT_USER_EMAIL || DEFAULT_AGENT_EMAIL

  const byId = await prisma.user.findUnique({
    where: { id: AGENT_USER_ID },
    select: { id: true, role: true },
  })
  if (byId) return byId

  // Un compte a pu être créé avec un autre id mais le même email (email @unique)
  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  })
  if (byEmail) return byEmail

  const created = await prisma.user.create({
    data: {
      id: AGENT_USER_ID,
      email,
      name: 'Agent MCP',
      password: DISABLED_PASSWORD,
      role: 'BOT',
      updatedAt: new Date(), // le modèle User n'a pas @updatedAt
    },
    select: { id: true, role: true },
  })
  return created
}

/**
 * Vérifie l'en-tête X-API-Key et renvoie l'identité agent, ou null si refusé.
 * Ne lève jamais pour un refus — l'appelant renvoie 401.
 */
export async function requireAgentAuth(request: Request): Promise<AgentIdentity | null> {
  const provided = request.headers.get('x-api-key')
  if (!provided) return null

  const configured = parseConfiguredKeys()
  if (configured.length === 0) {
    console.warn('[agent] OPENBTP_AGENT_KEYS non configuré — accès refusé (fail-closed)')
    return null
  }

  const providedHash = sha256Hex(provided)
  const match = configured.find((k) => constantTimeEqualHex(k.hash, providedHash))
  if (!match) return null

  const user = await getOrCreateAgentUser()
  return { userId: user.id, role: user.role, keyLabel: match.label }
}
