'use server'

import { prisma } from '@/lib/prisma'
import { Depense } from '@/types/depense'

/**
 * Récupère toutes les dépenses d'un chantier
 */
export async function getDepenses(chantierId: string): Promise<Depense[]> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const depenses = await prisma.$queryRaw`
      SELECT * FROM depense 
      WHERE chantierId = ${chantierId}
      ORDER BY date DESC
    ` as Depense[]
    
    return depenses
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error)
    return []
  }
}

/**
 * Récupère une dépense spécifique
 */
export async function getDepense(depenseId: string): Promise<Depense | null> {
  try {
    const depense = await prisma.$queryRaw`
      SELECT * FROM depense 
      WHERE id = ${depenseId}
    ` as Depense[]
    
    return depense[0] || null
  } catch (error) {
    console.error('Erreur lors de la récupération de la dépense:', error)
    return null
  }
} 