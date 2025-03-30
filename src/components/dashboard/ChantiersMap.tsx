'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'
import LeafletGeocoder from '@/components/LeafletGeocoder'
import { createLogger } from '@/lib/logger'

// Créer un logger spécifique pour ce composant
const logger = createLogger('ChantiersMap')

interface Chantier {
  id: string
  nom: string
  client: string
  etat: string
  montant: number
  progression: number
  adresse?: string
  latitude?: number
  longitude?: number
}

interface ChantiersMapProps {
  chantiers: Chantier[]
  loading?: boolean
}

export default function ChantiersMap({ chantiers, loading = false }: ChantiersMapProps) {
  const [mapKey, setMapKey] = useState<number>(Date.now()) // Clé pour forcer le rechargement de la carte
  
  // Formatage de montant pour l'affichage
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(montant)
  }

  // Forcer la mise à jour de la carte lorsque les chantiers changent
  useEffect(() => {
    setMapKey(Date.now())
  }, [chantiers])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chantiers en cours</h3>
      </div>
      
      <div className="p-4 relative" style={{ height: '400px' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Chargement de la carte...</p>
            </div>
          </div>
        ) : (
          <MapContainer 
            key={mapKey}
            center={[46.603354, 1.888334]} // Centrer sur la France
            zoom={5}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LeafletGeocoder 
              chantiers={chantiers}
              formatMontant={formatMontant}
            />
          </MapContainer>
        )}
      </div>
    </div>
  )
} 