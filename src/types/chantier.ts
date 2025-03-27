export interface Chantier {
  id: number
  chantierId: string
  nomChantier: string
  dateCommencement: string
  etatChantier: string
  clientNom: string | null
  clientEmail: string | null
  clientAdresse: string | null
  adresseChantier: string | null
  latitude: number | null
  longitude: number | null
  montantTotal: number
  dureeEnJours: number | null
  createdAt: string
  updatedAt: string
} 