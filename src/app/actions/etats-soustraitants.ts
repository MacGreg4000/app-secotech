'use server'

import { prisma } from '@/lib/prisma'

/**
 * Récupère tous les états sous-traitants d'un chantier
 */
export async function getEtatsSoustraitants(chantierId: string): Promise<any[]> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const etatsSoustraitants = await prisma.$queryRaw`
      SELECT * FROM "EtatSoustraitant" 
      WHERE "chantierId" = ${chantierId}
      ORDER BY date DESC
    ` as any[]
    
    return etatsSoustraitants
  } catch (error) {
    console.error('Erreur lors de la récupération des états sous-traitants:', error)
    return []
  }
}

/**
 * Récupère un état sous-traitant spécifique
 */
export async function getEtatSoustraitant(etatId: string): Promise<any | null> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const etats = await prisma.$queryRaw`
      SELECT * FROM "EtatSoustraitant" 
      WHERE id = ${etatId}
    ` as any[]
    
    return etats[0] || null
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'état sous-traitant:', error)
    return null
  }
} 