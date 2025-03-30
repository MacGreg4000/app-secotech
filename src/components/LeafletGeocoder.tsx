'use client'

import { useEffect, useState } from 'react'
import { useMap, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import "leaflet-defaulticon-compatibility"
import { createLogger } from '@/lib/logger'

// Créer un logger spécifique pour ce composant
const logger = createLogger('Geocoder');

// Type pour les chantiers
interface Chantier {
  id: string
  nom: string
  client: string
  etat: string
  montant: number
  progression: number
  adresseChantier?: string
  adresse?: string
  latitude?: number
  longitude?: number
}

interface LeafletGeocoderProps {
  chantiers: Chantier[]
  formatMontant: (montant: number) => string
}

// Composant pour gérer le géocodage
function GeocodeChantiers({ chantiers, formatMontant }: LeafletGeocoderProps) {
  const map = useMap()
  const [geolocatedChantiers, setGeolocatedChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    // Fix pour l'icône Leaflet - utilisation de leaflet-defaulticon-compatibility au lieu d'imports directs
    // Cette bibliothèque règle automatiquement les problèmes d'icônes dans Next.js

    // Préparation des icônes avec couleurs selon état du chantier
    const chantierIcon = (etat: string) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `<div class='marker-pin bg-${
          etat === 'En cours' ? 'green' : etat === 'En préparation' ? 'yellow' : 'blue'
        }-500'></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
      })
    }

    // Ajouter un style personnalisé à la carte elle-même
    map.getContainer().style.borderRadius = '8px'
    map.getContainer().style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
    
    // Changer le fournisseur de tuiles pour un style plus moderne
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://carto.com">CARTO</a> | © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    async function geocodeChantiers() {
      setLoading(true)
      const chantierWithCoords: Chantier[] = []

      // Filtrer pour ne garder que les chantiers "En cours"
      const chantiersEnCours = chantiers.filter(c => c.etat === "En cours")
      
      logger.info(`Total chantiers: ${chantiers.length}`);
      logger.info(`Chantiers en cours: ${chantiersEnCours.length}`);
      
      setDebugInfo(`Total: ${chantiers.length}, En cours: ${chantiersEnCours.length}`)

      // Traiter d'abord les chantiers qui ont déjà des coordonnées
      const existingCoords = chantiersEnCours.filter(c => c.latitude && c.longitude)
      chantierWithCoords.push(...existingCoords)

      // Puis traiter les chantiers qui ont une adresse mais pas de coordonnées
      const needsGeocoding = chantiersEnCours.filter(
        c => !c.latitude && !c.longitude && (c.adresseChantier || c.adresse || (c as any).address || (c as any).location)
      )

      logger.info(`Chantiers à géocoder: ${needsGeocoding.length}`);
      
      if (needsGeocoding.length === 0 && existingCoords.length === 0) {
        setDebugInfo(prev => `${prev} | Aucun chantier en cours à afficher`)
      }

      // Géocoder les adresses en série (pour éviter la limite de requêtes)
      for (const chantier of needsGeocoding) {
        // Vérifier plusieurs propriétés possibles pour l'adresse
        const adresse = chantier.adresseChantier || chantier.adresse || (chantier as any).address || (chantier as any).location
        
        if (!adresse) {
          logger.warn(`Pas d'adresse pour: ${chantier.nom}`);
          continue
        }

        try {
          logger.debug(`Géocodage pour: ${chantier.nom} - Adresse: ${adresse}`);
          
          // Utiliser l'API Photon pour géocoder l'adresse (meilleure que Nominatim)
          const response = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(adresse)}&limit=1&lang=fr`,
            {
              headers: {
                'User-Agent': 'SecoTech Application',
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            logger.debug(`Résultat pour ${chantier.nom}:`, data);
            
            if (data && data.features && data.features.length > 0) {
              const result = data.features[0]
              const coordinates = result.geometry.coordinates
              
              // Photon renvoie les coordonnées dans l'ordre [longitude, latitude]
              const longitude = coordinates[0]
              const latitude = coordinates[1]
              
              // Ajouter les coordonnées au chantier
              chantierWithCoords.push({
                ...chantier,
                latitude,
                longitude
              })
              logger.info(`Géocodage réussi pour: ${chantier.nom} - [${latitude}, ${longitude}]`);
            } else {
              logger.warn(`Pas de résultat pour: ${chantier.nom} - Adresse: ${adresse}`);
              
              // Fallback à Nominatim si Photon ne trouve pas l'adresse
              try {
                const nominatimResponse = await fetch(
                  `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}&limit=1&accept-language=fr`,
                  {
                    headers: {
                      'User-Agent': 'SecoTech Application',
                    },
                  }
                )
                
                if (nominatimResponse.ok) {
                  const nominatimData = await nominatimResponse.json()
                  if (nominatimData && nominatimData.length > 0) {
                    const nominatimResult = nominatimData[0]
                    chantierWithCoords.push({
                      ...chantier,
                      latitude: parseFloat(nominatimResult.lat),
                      longitude: parseFloat(nominatimResult.lon),
                    })
                    logger.info(`Fallback Nominatim réussi pour: ${chantier.nom}`);
                  }
                }
              } catch (fallbackError) {
                logger.error(`Erreur lors du fallback Nominatim pour ${chantier.nom}:`, fallbackError);
              }
            }
          }

          // Petite pause entre les requêtes pour respecter la limite de l'API
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          logger.error(`Erreur lors du géocodage pour ${chantier.nom}:`, error)
        }
      }

      logger.info('Chantiers géolocalisés:', chantierWithCoords);
      setGeolocatedChantiers(chantierWithCoords)
      setLoading(false)
      setDebugInfo(prev => `${prev} | Chantiers géolocalisés: ${chantierWithCoords.length}`)

      // Ajuster la vue de la carte si nous avons des chantiers
      if (chantierWithCoords.length > 0) {
        try {
          const bounds = L.latLngBounds(
            chantierWithCoords
              .filter(c => c.latitude && c.longitude)
              .map(c => [c.latitude!, c.longitude!])
          )
          map.fitBounds(bounds, { padding: [50, 50] })
        } catch (error) {
          logger.error('Erreur lors de l\'ajustement de la vue:', error)
        }
      }
    }

    geocodeChantiers()
  }, [chantiers, map])

  if (loading && geolocatedChantiers.length === 0) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white p-2 rounded shadow">
        Chargement des chantiers sur la carte...
      </div>
    )
  }

  if (!loading && geolocatedChantiers.length === 0) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white p-4 rounded shadow text-center">
        <div className="text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg">Aucun chantier en cours localisé</p>
          <p className="text-sm mt-1">
            Vérifiez que vos chantiers en cours ont bien une adresse renseignée.
          </p>
          {debugInfo && (
            <p className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-28">
              <strong>Info développeur:</strong> {debugInfo}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {geolocatedChantiers.map(chantier => (
        <Marker
          key={chantier.id}
          position={[chantier.latitude!, chantier.longitude!]}
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `<div class='marker-pin bg-${
              chantier.etat === 'En cours' ? 'green' : 
              chantier.etat === 'En préparation' ? 'yellow' : 'blue'
            }-500'></div><i class="material-icons"></i>`,
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -34]
          })}
        >
          <Popup>
            <div>
              <h3 className="font-bold text-lg">{chantier.nom}</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-medium">{chantier.client}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">État</p>
                  <p className="font-medium">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      chantier.etat === 'En cours' ? 'bg-green-100 text-green-800' : 
                      chantier.etat === 'En préparation' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {chantier.etat}
                    </span>
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-600">Montant</p>
                    <p className="font-medium">{formatMontant(chantier.montant)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Progression</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${chantier.progression}%` }}
                      ></div>
                    </div>
                    <p className="text-xs mt-1">{chantier.progression}%</p>
                  </div>
                </div>
              </div>
              {(chantier.adresseChantier || chantier.adresse) && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Adresse</p>
                  <p className="font-medium">{chantier.adresseChantier || chantier.adresse}</p>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

// Exporter correctement le composant
export default GeocodeChantiers
// Pour compatibilité avec le code existant
export { GeocodeChantiers as LeafletGeocoder } 