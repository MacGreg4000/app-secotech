import { PrismaClient } from '@prisma/client'

// Étendre le client Prisma avec des types personnalisés
const prismaClientSingleton = () => {
  try {
    // Vérifier si nous sommes en mode de build statique et sans DATABASE_URL
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build' && !process.env.DATABASE_URL) {
      // Créer un mock PrismaClient pour la compilation statique
      console.log('🔶 Mode de build détecté, utilisation d\'un client Prisma mock')
      return createMockPrismaClient()
    }
    
    const client = new PrismaClient()
    
    // Ajouter des méthodes personnalisées si nécessaire
    return client
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de PrismaClient:', error)
    return createMockPrismaClient()
  }
}

// Créer un mock de PrismaClient pour le build statique
function createMockPrismaClient() {
  const handler = {
    get: function(target: any, prop: string) {
      if (prop === '$connect') {
        return () => Promise.resolve()
      }
      if (prop === '$disconnect') {
        return () => Promise.resolve()
      }
      
      return new Proxy({}, {
        get: function() {
          return () => Promise.resolve([])
        }
      })
    }
  }
  
  return new Proxy({}, handler) as unknown as PrismaClient
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Test de connexion uniquement si pas en mode build
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  prisma.$connect()
    .then(() => {
      console.log('✅ Connexion à la base de données réussie')
    })
    .catch((e) => {
      console.error('❌ Erreur de connexion à la base de données:', e)
    })
}

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