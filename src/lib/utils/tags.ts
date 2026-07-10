/**
 * Utilitaires de normalisation des tags.
 *
 * Les tags sont saisis librement (rapports de visite, documents…) et doivent
 * être comparés de façon insensible à la casse ET aux accents, sinon on obtient
 * des doublons (« Électricien » vs « electricien ») et des filtres qui ne
 * correspondent pas.
 */

// Plage Unicode des diacritiques combinants (construite sans caractère
// combinant littéral dans le source, pour éviter toute fragilité d'encodage).
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

/**
 * Clé de comparaison canonique d'un tag : trim + minuscules + suppression des
 * accents + espaces multiples réduits. Sert UNIQUEMENT à comparer/dédupliquer,
 * jamais à l'affichage.
 */
export function normalizeTagKey(tag: string): string {
  return (tag || '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Forme canonique d'affichage d'un tag : on garde la casse d'origine mais on
 * nettoie les espaces superflus.
 */
export function canonicalTagName(tag: string): string {
  return (tag || '').trim().replace(/\s+/g, ' ')
}

/**
 * Deux tags sont-ils équivalents (insensible à la casse et aux accents) ?
 */
export function tagsMatch(a: string, b: string): boolean {
  return normalizeTagKey(a) === normalizeTagKey(b)
}

/**
 * Un tableau de tags contient-il un tag équivalent au tag cible ?
 */
export function tagsInclude(tags: string[] | undefined | null, target: string): boolean {
  if (!tags || tags.length === 0) return false
  const key = normalizeTagKey(target)
  return tags.some(t => normalizeTagKey(t) === key)
}

/**
 * Déduplique une liste de tags de façon insensible à la casse/accents, en
 * conservant la première graphie rencontrée.
 */
export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const name = canonicalTagName(raw)
    if (!name) continue
    const key = normalizeTagKey(name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}
