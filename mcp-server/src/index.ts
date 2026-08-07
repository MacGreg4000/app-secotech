#!/usr/bin/env node
/**
 * Serveur MCP OpenBTP — proxy fin.
 *
 * Toute la logique métier vit dans OpenBTP (src/lib/agent/tools). Ce serveur
 * ne fait que :
 *   1. lire le catalogue via GET  /api/agent/tools
 *   2. relayer les appels via POST /api/agent/execute
 *
 * Conséquence voulue : ajouter un outil côté OpenBTP le rend disponible dans
 * Claude SANS redéployer ni modifier ce serveur. Aucun nom d'outil n'est
 * codé en dur ici.
 *
 * Configuration (variables d'environnement) :
 *   OPENBTP_BASE_URL  ex. https://openbtp.secotech.synology.me
 *   OPENBTP_API_KEY   la clé en clair (son SHA-256 est configuré côté serveur)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const BASE_URL = (process.env.OPENBTP_BASE_URL || '').replace(/\/+$/, '')
const API_KEY = process.env.OPENBTP_API_KEY || ''

if (!BASE_URL || !API_KEY) {
  console.error(
    'openbtp-mcp : OPENBTP_BASE_URL et OPENBTP_API_KEY sont requis. ' +
      'Voir la configuration du serveur MCP dans Claude.'
  )
  process.exit(1)
}

interface CatalogEntry {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  requiresConfirmation: boolean
}

async function appelOpenBTP(chemin: string, init?: RequestInit): Promise<unknown> {
  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    ...init,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const texte = await reponse.text()
  let donnees: unknown
  try {
    donnees = texte ? JSON.parse(texte) : null
  } catch {
    throw new Error(
      `Réponse non-JSON d'OpenBTP (HTTP ${reponse.status}) : ${texte.slice(0, 200)}`
    )
  }

  if (!reponse.ok) {
    const message =
      (donnees as { error?: string } | null)?.error || `HTTP ${reponse.status}`
    throw new Error(`OpenBTP a refusé la requête : ${message}`)
  }
  return donnees
}

/**
 * Ajoute `dryRun` au schéma des outils d'écriture pour que le modèle puisse
 * demander une simulation. La convention d'usage est : dryRun d'abord, puis
 * exécution après validation humaine des chiffres.
 */
function schemaAvecDryRun(entry: CatalogEntry): CatalogEntry['parameters'] {
  if (!entry.requiresConfirmation) return entry.parameters
  return {
    ...entry.parameters,
    properties: {
      ...entry.parameters.properties,
      dryRun: {
        type: 'boolean',
        description:
          "Si true, valide et calcule tout SANS rien écrire, et renvoie un résumé " +
          "à faire confirmer par l'utilisateur. À utiliser avant toute écriture.",
      },
    },
  }
}

async function chargerCatalogue(): Promise<CatalogEntry[]> {
  const data = (await appelOpenBTP('/api/agent/tools')) as {
    version?: string
    tools?: CatalogEntry[]
  }
  return Array.isArray(data?.tools) ? data.tools : []
}

const server = new Server(
  { name: 'openbtp', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

// Le catalogue est relu à chaque listing : un outil ajouté côté OpenBTP
// apparaît sans redémarrer ce serveur.
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const catalogue = await chargerCatalogue()
  return {
    tools: catalogue.map((entry) => ({
      name: entry.name,
      description: entry.requiresConfirmation
        ? `[ÉCRITURE] ${entry.description}`
        : entry.description,
      inputSchema: schemaAvecDryRun(entry),
    })),
  }
})

server.setRequestHandler(CallToolRequestSchema, async (requete) => {
  const { name, arguments: args } = requete.params
  const { dryRun, ...reste } = (args || {}) as Record<string, unknown>

  try {
    const resultat = await appelOpenBTP('/api/agent/execute', {
      method: 'POST',
      body: JSON.stringify({
        tool: name,
        args: reste,
        ...(dryRun === true ? { dryRun: true } : {}),
      }),
    })

    const enveloppe = resultat as { ok?: boolean; result?: unknown }
    return {
      content: [
        { type: 'text', text: JSON.stringify(enveloppe.result ?? resultat, null, 2) },
      ],
      // Un échec métier est signalé au modèle sans casser la conversation
      isError: enveloppe.ok === false,
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      ],
      isError: true,
    }
  }
})

async function main() {
  // Échec explicite si OpenBTP est injoignable : mieux vaut une erreur claire
  // qu'un serveur qui démarre en exposant zéro outil sans rien dire.
  try {
    const catalogue = await chargerCatalogue()
    console.error(`openbtp-mcp : ${catalogue.length} outil(s) disponible(s).`)
  } catch (error) {
    console.error(
      `openbtp-mcp : impossible de joindre OpenBTP (${BASE_URL}). ` +
        `Vérifie OPENBTP_BASE_URL et OPENBTP_API_KEY. Détail : ` +
        (error instanceof Error ? error.message : 'inconnu')
    )
    process.exit(1)
  }

  await server.connect(new StdioServerTransport())
}

main().catch((error) => {
  console.error('openbtp-mcp : arrêt sur erreur —', error)
  process.exit(1)
})
