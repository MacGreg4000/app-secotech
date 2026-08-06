// Idempotence best-effort des exécutions d'outils.
//
// Cible le cas réel : le client MCP réessaie après un timeout réseau alors que
// l'écriture a abouti → sans garde-fou, on crée un doublon.
//
// Volontairement en mémoire (pas de table) : la fenêtre utile est de quelques
// minutes. Conséquence à connaître : le cache disparaît au redémarrage du
// conteneur. La vraie protection reste l'idempotence métier de chaque outil
// (find-or-create, contraintes uniques pré-contrôlées, refus de doublon).

const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 500

interface Entry {
  result: unknown
  expiresAt: number
}

const cache = new Map<string, Entry>()

function purge(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
  // garde-fou mémoire : on évacue les plus anciennes entrées insérées
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
}

function compositeKey(tool: string, idempotencyKey: string): string {
  return `${tool}::${idempotencyKey}`
}

/** Résultat déjà produit pour cette clé, ou undefined. */
export function getIdempotent(tool: string, idempotencyKey: string): unknown | undefined {
  const now = Date.now()
  purge(now)
  const entry = cache.get(compositeKey(tool, idempotencyKey))
  if (!entry) return undefined
  if (entry.expiresAt <= now) {
    cache.delete(compositeKey(tool, idempotencyKey))
    return undefined
  }
  return entry.result
}

/** Mémorise le résultat d'une exécution réussie. */
export function setIdempotent(tool: string, idempotencyKey: string, result: unknown): void {
  const now = Date.now()
  purge(now)
  cache.set(compositeKey(tool, idempotencyKey), { result, expiresAt: now + TTL_MS })
}
