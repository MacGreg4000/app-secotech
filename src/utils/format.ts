/**
 * Formate un nombre en devise (EUR par défaut)
 * @param amount Le montant à formater
 * @param currency La devise (par défaut EUR)
 * @returns Le montant formaté en chaîne de caractères
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Formate un nombre avec séparateurs de milliers
 * @param num Le nombre à formater
 * @param decimals Le nombre de décimales (par défaut 2)
 * @returns Le nombre formaté en chaîne de caractères
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

/**
 * Formate un pourcentage
 * @param value La valeur à formater (ex: 0.15 pour 15%)
 * @param decimals Le nombre de décimales (par défaut 1)
 * @returns Le pourcentage formaté en chaîne de caractères
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Formate une date au format français
 */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
} 