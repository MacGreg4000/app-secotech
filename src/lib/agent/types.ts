// Types du socle d'outils "agent" (consommé par MCP via /api/agent/*).
//
// Volontairement découplé de tout fournisseur de modèle (pas d'import Ollama) :
// la même ToolDefinition sert au serveur MCP et pourra resservir à un chatbot
// interne. Les schémas de paramètres sont du JSON Schema standard, format
// commun à MCP et aux API de tool-calling.

/** Sous-ensemble de JSON Schema utilisé pour décrire les paramètres d'un outil. */
export interface JSONSchemaObject {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
}

export interface ToolContext {
  /** Utilisateur réel auteur des écritures (User.id) — jamais vide. */
  userId: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: JSONSchemaObject
  /** Outil d'écriture : à confirmer par l'humain avant exécution réelle. */
  requiresConfirmation?: boolean
  /** Résumé lisible (français) de l'action proposée. */
  summarize?: (args: Record<string, unknown>) => Promise<string> | string
  /**
   * Dry-run enrichi : résout et valide les arguments, renvoie les valeurs
   * calculées (totaux, entités résolues, avertissements) SANS rien écrire.
   * Si absent, le dry-run se limite au `summarize`.
   */
  preview?: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>
}

/** Entrée du catalogue exposée par GET /api/agent/tools. */
export interface ToolCatalogEntry {
  name: string
  description: string
  parameters: JSONSchemaObject
  requiresConfirmation: boolean
}

export interface ToolCallLogEntry {
  name: string
  durationMs: number
  ok: boolean
}
