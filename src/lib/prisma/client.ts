import { PrismaClient } from '@prisma/client'

// Étendre le client Prisma avec des types personnalisés
const prismaClientSingleton = () => {
  const client = new PrismaClient()
  
  // Ajouter des méthodes personnalisées si nécessaire
  return client
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Test de connexion
prisma.$connect()
  .then(() => {
    console.log('✅ Connexion à la base de données réussie')
  })
  .catch((e) => {
    console.error('❌ Erreur de connexion à la base de données:', e)
  })

// Types personnalisés pour les commandes sous-traitant
export interface CommandeSousTraitantWithRelations {
  id: number
  chantierId: string
  soustraitantId: string
  dateCommande: Date
  reference: string | null
  tauxTVA: number
  sousTotal: number
  tva: number
  total: number
  statut: string
  estVerrouillee: boolean
  createdAt: Date
  updatedAt: Date
  chantier: {
    id: number
    chantierId: string
    nomChantier: string
    // autres propriétés du chantier
  }
  soustraitant: {
    id: string
    nom: string
    email: string
    contact: string | null
    adresse: string | null
    telephone: string | null
    tva: string | null
    // autres propriétés du sous-traitant
  }
  lignes: {
    id: number
    commandeSousTraitantId: number
    ordre: number
    article: string
    description: string
    type: string
    unite: string
    prixUnitaire: number
    quantite: number
    total: number
    createdAt: Date
    updatedAt: Date
  }[]
} 