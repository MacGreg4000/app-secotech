'use client'

import React, { useEffect, useState } from 'react'

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

interface SimpleMapNasProps {
  chantiers: Chantier[]
  loading: boolean
}

export default function SimpleMapNas({ chantiers, loading }: SimpleMapNasProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (loading) {
    return (
      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
        <p>Chargement des données...</p>
      </div>
    )
  }

  return (
    <div className="h-auto bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Localisation des chantiers</h3>
      
      {!isClient ? (
        <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
          <p>Chargement de la liste...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chantiers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun chantier disponible</p>
          ) : (
            chantiers.map((chantier) => (
              <div key={chantier.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="font-medium">{chantier.nom}</div>
                <div className="text-sm text-gray-600">
                  <div>Client: {chantier.client}</div>
                  <div>État: {chantier.etat}</div>
                  <div>Montant: {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(chantier.montant)}</div>
                  {chantier.adresseChantier && (
                    <div>Adresse: {chantier.adresseChantier}</div>
                  )}
                  {chantier.latitude && chantier.longitude && (
                    <div className="text-xs text-gray-500 mt-1">
                      Coordonnées: {chantier.latitude.toFixed(5)}, {chantier.longitude.toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
} 