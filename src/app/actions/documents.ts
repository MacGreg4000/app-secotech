'use server'

import { prisma } from '@/lib/prisma'

/**
 * Récupère tous les documents d'un chantier
 */
export async function getDocuments(chantierId: string): Promise<any[]> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const documents = await prisma.$queryRaw`
      SELECT * FROM document
      WHERE "chantierId" = ${chantierId}
      ORDER BY "updatedAt" DESC
    ` as any[]
    
    return documents
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error)
    return []
  }
}

/**
 * Récupère un document spécifique
 */
export async function getDocument(documentId: string): Promise<any | null> {
  try {
    // Utiliser une requête SQL brute pour contourner les problèmes de type Prisma
    const documents = await prisma.$queryRaw`
      SELECT * FROM document
      WHERE id = ${documentId}
    ` as any[]
    
    return documents[0] || null
  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error)
    return null
  }
} 