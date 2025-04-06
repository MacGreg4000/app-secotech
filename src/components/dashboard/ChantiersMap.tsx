'use client'

import { useState, useEffect, useRef } from 'react'
import { createLogger } from '@/lib/logger'

// Logger pour ce composant
const logger = createLogger('ChantiersMap')

// Types
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

interface ChantiersMapProps {
  chantiers: Chantier[]
  loading?: boolean
}

// Composant principal
export default function ChantiersMap({ chantiers, loading = false }: ChantiersMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  // Formatage de montant pour l'affichage
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(montant);
  };

  // Vérifier si on est côté client
  useEffect(() => {
    setIsClient(true);
    return () => {
      // Nettoyer la carte au démontage
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Mise à jour des stats pour le debug
  useEffect(() => {
    if (!isClient) return;

    try {
      const chantiersEnCours = chantiers.filter(c => c.etat === "En cours");
      const chantiersAvecCoords = chantiers.filter(c => c.latitude && c.longitude);
      const chantiersAvecAdresse = chantiers.filter(c => c.adresse || c.adresseChantier);
      
      setDebugInfo(`Total: ${chantiers.length}, En cours: ${chantiersEnCours.length}, 
                   Coords: ${chantiersAvecCoords.length}, Adresse: ${chantiersAvecAdresse.length}`);
      
      logger.info(`Chantiers pour la carte: ${chantiers.length}`);
    } catch (error) {
      logger.error('Erreur stats:', error);
    }
  }, [chantiers, isClient]);

  // Initialisation et mise à jour de la carte
  useEffect(() => {
    if (!isClient || loading || !mapContainerRef.current) return;

    // Importer les dépendances Leaflet uniquement côté client
    const initializeMap = async () => {
      try {
        // Nettoyer la carte précédente si elle existe
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Importer Leaflet uniquement côté client
        const leafletModule = await import('leaflet');
        const L = leafletModule.default;
        
        // S'assurer que le composant de compatibilité est importé de façon dynamique
        await import('leaflet-defaulticon-compatibility');

        // Créer une nouvelle carte si le conteneur existe
        if (mapContainerRef.current) {
          // Centre sur Bruxelles par défaut (au lieu de la France)
          const map = L.map(mapContainerRef.current).setView([50.8503, 4.3517], 8);
          
          // Ajouter un style de carte plus moderne (Carto Voyager)
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
          }).addTo(map);

          // Stocker l'instance de la carte
          mapInstanceRef.current = map;

          // Géocoder et ajouter les marqueurs
          await addMarkers(map, L, chantiers);
        }
      } catch (error) {
        logger.error('Erreur lors de l\'initialisation de la carte:', error);
      }
    };

    initializeMap();
  }, [chantiers, isClient, loading]);

  // Fonction pour ajouter les marqueurs
  async function addMarkers(map: any, L: any, chantiers: Chantier[]) {
    try {
      // Ne plus filtrer uniquement les chantiers en cours
      logger.info(`Nombre total de chantiers à afficher: ${chantiers.length}`);
      
      const markers = [];
      const geolocatedChantiers = [];

      // Créer une icône personnalisée avec l'image du pointeur
      const customIcon = L.icon({
        iconUrl: '/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: '/images/marker-shadow.png',
        shadowSize: [41, 41],
        shadowAnchor: [12, 41]
      });

      // D'abord traiter les chantiers avec coordonnées
      for (const chantier of chantiers) {
        logger.info(`Traitement du chantier: ${chantier.nom}`);
        logger.info(`Coordonnées: lat=${chantier.latitude}, lon=${chantier.longitude}`);
        
        if (chantier.latitude && chantier.longitude && 
            !isNaN(Number(chantier.latitude)) && !isNaN(Number(chantier.longitude))) {
          
          // Créer le marqueur avec l'icône personnalisée
          const marker = L.marker([chantier.latitude, chantier.longitude], {
            icon: customIcon
          });

          // Ajouter la popup avec un style moderne
          marker.bindPopup(`
            <div class="p-3">
              <h3 class="font-bold text-lg text-blue-600 mb-2">${chantier.nom}</h3>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <p><span class="font-medium text-gray-700">Client:</span></p>
                <p>${chantier.client}</p>
                <p><span class="font-medium text-gray-700">État:</span></p>
                <p>${chantier.etat}</p>
                <p><span class="font-medium text-gray-700">Montant:</span></p>
                <p>${formatMontant(chantier.montant)}</p>
                <p><span class="font-medium text-gray-700">Progression:</span></p>
                <p>${chantier.progression}%</p>
                ${(chantier.adresse || chantier.adresseChantier) ? `
                <p><span class="font-medium text-gray-700">Adresse:</span></p>
                <p>${chantier.adresseChantier || chantier.adresse}</p>` : ''}
              </div>
            </div>
          `, { 
            className: 'custom-popup',
            maxWidth: 300
          });

          // Ajouter le marqueur à la carte
          marker.addTo(map);
          markers.push(marker);
          geolocatedChantiers.push(chantier);
          logger.info(`Marqueur ajouté pour le chantier: ${chantier.nom}`);
        } else {
          logger.info(`Chantier sans coordonnées valides: ${chantier.nom}`);
        }
      }

      // Géocoder les adresses pour les chantiers sans coordonnées
      for (const chantier of chantiers) {
        if (!chantier.latitude || !chantier.longitude || 
            isNaN(Number(chantier.latitude)) || isNaN(Number(chantier.longitude))) {
          
          const adresse = chantier.adresseChantier || chantier.adresse;
          if (!adresse) continue;

          try {
            // Géocoder avec Nominatim
            const coords = await geocodeAddress(adresse);
            
            if (coords) {
              // Créer le marqueur avec l'icône personnalisée
              const marker = L.marker([coords.lat, coords.lon], {
                icon: customIcon
              });

              // Ajouter la popup avec un style moderne
              marker.bindPopup(`
                <div class="p-3">
                  <h3 class="font-bold text-lg text-blue-600 mb-2">${chantier.nom}</h3>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <p><span class="font-medium text-gray-700">Client:</span></p>
                    <p>${chantier.client}</p>
                    <p><span class="font-medium text-gray-700">État:</span></p>
                    <p>${chantier.etat}</p>
                    <p><span class="font-medium text-gray-700">Montant:</span></p>
                    <p>${formatMontant(chantier.montant)}</p>
                    <p><span class="font-medium text-gray-700">Progression:</span></p>
                    <p>${chantier.progression}%</p>
                    <p><span class="font-medium text-gray-700">Adresse:</span></p>
                    <p>${adresse}</p>
                  </div>
                </div>
              `, { 
                className: 'custom-popup',
                maxWidth: 300
              });

              // Ajouter le marqueur à la carte
              marker.addTo(map);
              markers.push(marker);
              geolocatedChantiers.push({
                ...chantier,
                latitude: coords.lat,
                longitude: coords.lon
              });
            }
          } catch (error) {
            logger.error(`Erreur lors du géocodage pour ${chantier.nom}:`, error);
          }
        }
      }

      // Ajuster la vue pour inclure tous les marqueurs
      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }

    } catch (error) {
      logger.error('Erreur lors de l\'ajout des marqueurs:', error);
    }
  }

  // Fonction pour géocoder une adresse
  async function geocodeAddress(adresse: string): Promise<{lat: number, lon: number} | null> {
    try {
      logger.info(`Tentative de géocodage pour l'adresse: ${adresse}`);
      
      // Ajouter le pays si non spécifié dans l'adresse pour améliorer les résultats
      let adresseComplete = adresse;
      const paysConnus = ['france', 'belgique', 'belgium', 'suisse', 'switzerland', 'luxembourg'];
      const adresseBas = adresse.toLowerCase();
      const contientPays = paysConnus.some(pays => adresseBas.includes(pays));
      
      if (!contientPays) {
        // Si l'adresse ne contient pas déjà un pays, essayer d'abord sans spécifier
        // puis avec divers pays si nécessaire
      }
      
      // Premier essai avec l'adresse telle quelle
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresseComplete)}&limit=1&accept-language=fr`,
        { 
          headers: { 
            'User-Agent': 'SecoTech Application',
            'Accept': 'application/json' 
          }
        }
      );
      
      if (!response.ok) {
        logger.error(`Erreur lors du géocodage: ${response.status} ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      logger.info(`Résultat du géocodage: ${JSON.stringify(data)}`);
      
      if (data && data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        };
        logger.info(`Adresse géocodée avec succès: ${adresse} -> [${result.lat}, ${result.lon}]`);
        return result;
      }
      
      // Si aucun résultat avec l'adresse d'origine, essayer avec le pays spécifié explicitement
      if (!contientPays) {
        // Essayer avec Belgique en premier, puis France en second
        for (const pays of ['Belgique', 'France']) {
          adresseComplete = `${adresse}, ${pays}`;
          logger.info(`Nouvel essai avec pays: ${adresseComplete}`);
          
          const responseWithCountry = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresseComplete)}&limit=1&accept-language=fr`,
            { 
              headers: { 
                'User-Agent': 'SecoTech Application',
                'Accept': 'application/json' 
              }
            }
          );
          
          if (responseWithCountry.ok) {
            const dataWithCountry = await responseWithCountry.json();
            
            if (dataWithCountry && dataWithCountry.length > 0) {
              const result = {
                lat: parseFloat(dataWithCountry[0].lat),
                lon: parseFloat(dataWithCountry[0].lon)
              };
              logger.info(`Adresse géocodée avec succès (avec pays): ${adresseComplete} -> [${result.lat}, ${result.lon}]`);
              return result;
            }
          }
          
          // Attendre un peu entre les requêtes pour respecter les limites de l'API
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Si nous n'avons toujours pas de résultat, utiliser le service de géocodage Photon
      try {
        logger.info(`Essai avec le service Photon: ${adresse}`);
        const photonResponse = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(adresse)}&limit=1&lang=fr`,
          { headers: { 'User-Agent': 'SecoTech Application' } }
        );
        
        if (photonResponse.ok) {
          const photonData = await photonResponse.json();
          
          if (photonData && photonData.features && photonData.features.length > 0) {
            const coordinates = photonData.features[0].geometry.coordinates;
            const result = {
              lat: coordinates[1],
              lon: coordinates[0]
            };
            logger.info(`Adresse géocodée avec Photon: ${adresse} -> [${result.lat}, ${result.lon}]`);
            return result;
          }
        }
      } catch (photonError) {
        logger.error(`Erreur avec le service Photon: ${photonError}`);
      }
      
      // En dernier recours, utiliser la Belgique comme position par défaut
      logger.warn(`Aucun résultat trouvé pour l'adresse: ${adresse}, utilisation d'une position en Belgique`);
      return { 
        lat: 50.8503 + (Math.random() * 0.5 - 0.25), // Bruxelles +/- ~25km
        lon: 4.3517 + (Math.random() * 0.5 - 0.25) 
      };
    } catch (error) {
      logger.error(`Erreur de géocodage pour ${adresse}:`, error);
      // Fallback en Belgique
      return { 
        lat: 50.8503 + (Math.random() * 0.5 - 0.25), // Bruxelles +/- ~25km
        lon: 4.3517 + (Math.random() * 0.5 - 0.25)
      };
    }
  }

  // Si chargement en cours
  if (loading || !isClient) {
    return <LoadingView />;
  }

  // Si pas de chantiers
  if (chantiers.length === 0) {
    return <EmptyView debugInfo={debugInfo} />;
  }

  // Rendu de la carte
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chantiers en cours</h3>
      </div>
      
      <div className="p-4 relative" style={{ height: '500px' }}>
        <div 
          ref={mapContainerRef}
          style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        />
      </div>
    </div>
  );
}

// Vue de chargement
function LoadingView() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chantiers en cours</h3>
      </div>
      <div className="p-4 relative" style={{ height: '500px' }}>
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Chargement de la carte...</p>
            </div>
          </div>
      </div>
    </div>
  );
}

// Vue quand il n'y a pas de chantiers
function EmptyView({ debugInfo }: { debugInfo: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chantiers en cours</h3>
      </div>
      <div className="p-4 relative" style={{ height: '500px' }}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300">Aucun chantier à afficher</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Créez des chantiers avec l'état "En cours" pour les voir sur la carte</p>
            {debugInfo && (
              <p className="text-xs mt-4 p-2 bg-gray-200 dark:bg-gray-600 rounded">
                <strong>Info debug:</strong> {debugInfo}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 