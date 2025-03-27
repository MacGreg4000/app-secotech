'use server'

import { prisma } from '@/lib/prisma'
import { EtatAvancement } from '@/types/etat-avancement'

/**
 * Récupère tous les états d'avancement d'un chantier
 */
export async function getAllEtatsAvancement(chantierId: string): Promise<any[]> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const etats = await prisma.$queryRaw`
      SELECT e.*, 
        (SELECT json_agg(l.*) FROM "LigneEtatAvancement" l WHERE l."etatAvancementId" = e.id) as lignes
      FROM "EtatAvancement" e
      WHERE e."chantierId" = ${chantierId}
      ORDER BY e.date DESC
    ` as any[]
    
    return etats
  } catch (error) {
    console.error('Erreur lors de la récupération des états d\'avancement:', error)
    return []
  }
}

/**
 * Récupère un état d'avancement spécifique
 */
export async function getEtatAvancement(etatId: string): Promise<any> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const etats = await prisma.$queryRaw`
      SELECT e.*, 
        (SELECT json_agg(l.*) FROM "LigneEtatAvancement" l WHERE l."etatAvancementId" = e.id) as lignes
      FROM "EtatAvancement" e
      WHERE e.id = ${etatId}
    ` as any[]
    
    return etats[0] || null
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'état d\'avancement:', error)
    return null
  }
}

/**
 * Récupère le prochain état d'avancement
 */
export async function getNextEtatAvancement(etatId: string): Promise<any> {
  try {
    // Récupérer l'état actuel pour obtenir son numéro et chantierId
    const currentEtats = await prisma.$queryRaw`
      SELECT * FROM "EtatAvancement"
      WHERE id = ${etatId}
    ` as any[]
    
    const currentEtat = currentEtats[0]
    if (!currentEtat) return null
    
    // Récupérer l'état suivant
    const nextEtats = await prisma.$queryRaw`
      SELECT e.*, 
        (SELECT json_agg(l.*) FROM "LigneEtatAvancement" l WHERE l."etatAvancementId" = e.id) as lignes
      FROM "EtatAvancement" e
      WHERE e."chantierId" = ${currentEtat.chantierId}
        AND e.numero > ${currentEtat.numero}
      ORDER BY e.numero ASC
      LIMIT 1
    ` as any[]
    
    return nextEtats[0] || null
  } catch (error) {
    console.error('Erreur lors de la récupération du prochain état d\'avancement:', error)
    return null
  }
} 