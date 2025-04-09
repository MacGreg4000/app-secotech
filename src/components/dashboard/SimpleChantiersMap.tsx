'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Chantier {
  id: string
  nom: string
  client: string
  etat: string
  montant: number
  progression: number
  adresse?: string
  adresseChantier?: string
  latitude?: number
  longitude?: number
}

interface SimpleChantiersMapProps {
  chantiers: Chantier[]
  loading: boolean
}

export default function SimpleChantiersMap({ chantiers, loading }: SimpleChantiersMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !mapContainerRef.current || loading) return

    // Initialiser la carte
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([46.603354, 1.888334], 6)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current)
    }

    // Nettoyer les marqueurs existants
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer)
      }
    })

    // Ajouter les marqueurs pour chaque chantier
    chantiers.forEach((chantier) => {
      if (chantier.latitude && chantier.longitude) {
        const marker = L.marker([chantier.latitude, chantier.longitude])
        marker.bindPopup(`
          <strong>${chantier.nom}</strong><br>
          Client: ${chantier.client}<br>
          État: ${chantier.etat}<br>
          Montant: ${new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
          }).format(chantier.montant)}
        `)
        marker.addTo(mapRef.current!)
      }
    })

    // Ajuster la vue pour inclure tous les marqueurs
    if (chantiers.length > 0) {
      const bounds = L.latLngBounds(
        chantiers
          .filter(c => c.latitude && c.longitude)
          .map(c => [c.latitude!, c.longitude!])
      )
      mapRef.current.fitBounds(bounds)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [chantiers, loading, isClient])

  if (loading) {
    return (
      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p>Chargement des données...</p>
      </div>
    )
  }

  if (!isClient) {
    return (
      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p>Chargement de la carte...</p>
      </div>
    )
  }

  return (
    <div className="h-[400px] bg-gray-100 rounded-lg overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  )
} 