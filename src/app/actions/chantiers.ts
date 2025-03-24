'use server'

import { prisma } from '@/lib/prisma'

/**
 * Récupère les informations d'un chantier
 */
export async function getChantier(chantierId: string): Promise<any> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const chantiers = await prisma.$queryRaw`
      SELECT * FROM chantier
      WHERE id = ${chantierId}
    ` as any[]
    
    return chantiers[0] || null
  } catch (error) {
    console.error('Erreur lors de la récupération du chantier:', error)
    return null
  }
}

/**
 * Récupère tous les chantiers
 */
export async function getAllChantiers(): Promise<any[]> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const chantiers = await prisma.$queryRaw`
      SELECT * FROM chantier
      ORDER BY "dateDebut" DESC
    ` as any[]
    
    return chantiers
  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers:', error)
    return []
  }
} 