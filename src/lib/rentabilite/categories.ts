// Vocabulaire des catégories matière et contrôle de cohérence des unités.
//
// Module volontairement PUR — aucun import de Prisma. C'est ce qui permet à la
// modale de saisie (composant client) de partager exactement les mêmes règles
// que le calcul serveur au lieu d'en réimplémenter une copie qui dériverait.

/** Catégories de pose reconnues (colonne String, pas d'enum Prisma). */
export const CATEGORIES_MATERIAU = ['SOL', 'MUR', 'PLINTHE', 'ETANCHEITE'] as const
export type CategorieMateriau = (typeof CATEGORIES_MATERIAU)[number]

export function estCategorieMateriau(v: unknown): v is CategorieMateriau {
  return typeof v === 'string' && (CATEGORIES_MATERIAU as readonly string[]).includes(v)
}

// Marqueur « ligne sans matière » : avaloirs, caniveaux, heures de main-d'œuvre.
// Il ne s'agit PAS d'une catégorie de pose — le calcul l'ignore exactement comme
// une ligne vide. Sa raison d'être est ailleurs : distinguer « déjà examiné,
// rien à compter » de « pas encore traité ». Sans cette distinction, un chantier
// entièrement encodé afficherait les mêmes avertissements qu'un chantier oublié,
// et on ne saurait jamais quand on a fini.
export const CATEGORIE_AUCUNE = 'AUCUNE'

export const LIBELLES_CATEGORIE: Record<string, string> = {
  SOL: 'Sol',
  MUR: 'Mur',
  PLINTHE: 'Plinthe',
  ETANCHEITE: 'Étanchéité',
  [CATEGORIE_AUCUNE]: 'Non concerné',
}

// ── Cohérence unité / catégorie ─────────────────────────────────────────────
// Le barème s'exprime par m² (SOL, MUR, ETANCHEITE) ou par mètre linéaire
// (PLINTHE). Appliquer ces ratios à une ligne facturée en « Pièces » donnerait
// un montant dénué de sens. On avertit sans bloquer : c'est un jugement métier.
const UNITES_SURFACE = ['m2']
const UNITES_LINEAIRES = ['m', 'ml', 'mct']

export function normaliserUnite(u: string): string {
  return String(u || '')
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .replace(/²/g, '2')
    .trim()
}

/** Renvoie un message si l'unité de la ligne contredit la catégorie, sinon null. */
export function verifierUniteCategorie(categorie: string, unite: string): string | null {
  const u = normaliserUnite(unite)
  if (!u) return null
  const attenduLineaire = categorie === 'PLINTHE'
  const ok = attenduLineaire ? UNITES_LINEAIRES.includes(u) : UNITES_SURFACE.includes(u)
  if (ok) return null
  return attenduLineaire
    ? `unité « ${unite} » alors que ${categorie} attend un métré linéaire`
    : `unité « ${unite} » alors que ${categorie} attend des m²`
}
