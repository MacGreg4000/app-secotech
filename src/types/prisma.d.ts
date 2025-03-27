import { Prisma } from '@prisma/client'

// Types pour les commandes sous-traitant
export interface CommandeSousTraitant {
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
  chantier: Chantier
  soustraitant: Soustraitant
  lignes: LigneCommandeSousTraitant[]
  etatsAvancement: SoustraitantEtatAvancement[]
}

export interface LigneCommandeSousTraitant {
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
  commandeSousTraitant: CommandeSousTraitant
}

export interface Chantier {
  id: number
  chantierId: string
  nomChantier: string
  dateCommencement: Date
  etatChantier: string
  clientNom: string | null
  clientEmail: string | null
  clientAdresse: string | null
  adresseChantier: string | null
  latitude: number | null
  longitude: number | null
  montantTotal: number
  createdAt: Date
  updatedAt: Date
  clientId: string | null
  dureeEnJours: number | null
}

export interface Soustraitant {
  id: string
  nom: string
  email: string
  contact: string | null
  adresse: string | null
  telephone: string | null
  tva: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SoustraitantEtatAvancement {
  id: number
  etatAvancementId: number
  soustraitantId: string
  commandeSousTraitantId: number | null
  numero: number
  date: Date
  commentaires: string | null
  estFinalise: boolean
  createdAt: Date
  updatedAt: Date
}

// Étendre le client Prisma pour inclure nos nouveaux modèles
declare global {
  namespace PrismaClient {
    interface PrismaClient {
      commandeSousTraitant: Prisma.CommandeSousTraitantDelegate<Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>
    }
  }
} 