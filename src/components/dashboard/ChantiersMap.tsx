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
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Erreur lors du nettoyage de la carte:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

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

        // Importer Leaflet et CSS de manière dynamique
        const L = await import('leaflet').then(m => m.default);
        
        // Importer les CSS côté client seulement
        if (typeof window !== 'undefined') {
          // On s'assure que les CSS sont chargés
          require('leaflet/dist/leaflet.css');
          await import('leaflet-defaulticon-compatibility');
          require('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');
        }

        // Créer une nouvelle carte si le conteneur existe
        if (mapContainerRef.current) {
          // Centre sur Bruxelles par défaut
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
        // Ne pas propager l'erreur pour éviter de casser l'application
      }
    };

    initializeMap();
  }, [chantiers, isClient, loading]);

  // Fonction pour ajouter les marqueurs
  async function addMarkers(map: any, L: any, chantiers: Chantier[]) {
    try {
      logger.info(`Nombre total de chantiers à afficher: ${chantiers.length}`);
      
      const markers = [];

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
        if (chantier.latitude && chantier.longitude && 
            !isNaN(Number(chantier.latitude)) && !isNaN(Number(chantier.longitude))) {
          
          try {
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
          } catch (error) {
            logger.error(`Erreur lors de l'ajout du marqueur pour ${chantier.nom}:`, error);
          }
        }
      }

      // Simplification: pas de géocodage dans la version de production
      // pour éviter les problèmes lors du build

      // Ajuster la vue pour inclure tous les marqueurs
      if (markers.length > 0) {
        try {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds(), { padding: [50, 50] });
        } catch (error) {
          logger.error('Erreur lors de l\'ajustement de la vue:', error);
        }
      }

    } catch (error) {
      logger.error('Erreur lors de l\'ajout des marqueurs:', error);
    }
  }

  // Si chargement en cours
  if (loading || !isClient) {
    return <LoadingView />;
  }

  // Si pas de chantiers
  if (chantiers.length === 0) {
    return <EmptyView />;
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
function EmptyView() {
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
          </div>
        </div>
      </div>
    </div>
  );
} 