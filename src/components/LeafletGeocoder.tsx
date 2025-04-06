'use client'

import { useEffect, useState, useCallback, memo } from 'react'
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

// Props pour le composant
interface LeafletGeocoderProps {
  chantiers: Chantier[]
  formatMontant: (montant: number) => string
}

// Désactiver le rendu superflu avec memo
const LeafletGeocoder = memo(function LeafletGeocoder(props: LeafletGeocoderProps) {
  return <GeocodeChantiers {...props} />
});

export default LeafletGeocoder;

// Fonction pour créer un marqueur de chantier
function createChantierMarker(chantier: Chantier, formatMontant: (montant: number) => string) {
  if (!chantier.latitude || !chantier.longitude) return null;
  
  return (
    <Marker 
      key={chantier.id}
      position={[chantier.latitude, chantier.longitude]}
      icon={L.divIcon({
        className: 'custom-div-icon',
        html: `<div class='marker-pin bg-${
          chantier.etat === 'En cours' ? 'green' : chantier.etat === 'En préparation' ? 'yellow' : 'blue'
        }-500'></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
      })}
    >
      <Popup className="chantier-popup">
        <div>
          <h3 className="font-bold text-lg">{chantier.nom}</h3>
          <p><span className="font-medium">Client:</span> {chantier.client}</p>
          <p><span className="font-medium">Montant:</span> {formatMontant(chantier.montant)}</p>
          <p><span className="font-medium">Progression:</span> {chantier.progression}%</p>
          {(chantier.adresse || chantier.adresseChantier) && (
            <p><span className="font-medium">Adresse:</span> {chantier.adresseChantier || chantier.adresse}</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// Composant pour gérer le géocodage
function GeocodeChantiers({ chantiers, formatMontant }: LeafletGeocoderProps) {
  const map = useMap();
  const [geolocatedChantiers, setGeolocatedChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeocoded, setIsGeocoded] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  // Fonction de géocodage
  const geocodeChantiers = useCallback(async () => {
    if (isGeocoded) return; // Ne pas exécuter si déjà géocodé
    
    setLoading(true);
    const chantierWithCoords: Chantier[] = [];

    // Filtrer pour les chantiers "En cours"
    const chantiersEnCours = chantiers.filter(c => c.etat === "En cours");
    
    logger.info(`Total chantiers: ${chantiers.length}, En cours: ${chantiersEnCours.length}`);
    setDebugInfo(`Total: ${chantiers.length}, En cours: ${chantiersEnCours.length}`);

    // D'abord ajouter les chantiers qui ont déjà des coordonnées valides
    const existingCoords = chantiersEnCours.filter(c => 
      c.latitude && c.longitude && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude))
    );
    chantierWithCoords.push(...existingCoords);

    // Préparer les chantiers qui ont besoin de géocodage
    const needsGeocoding = chantiersEnCours.filter(c => 
      (!c.latitude || !c.longitude || isNaN(Number(c.latitude)) || isNaN(Number(c.longitude))) && 
      (c.adresseChantier || c.adresse)
    );
    
    logger.info(`Chantiers avec coordonnées: ${existingCoords.length}, à géocoder: ${needsGeocoding.length}`);

    // Si aucun chantier n'a besoin de géocodage
    if (needsGeocoding.length === 0) {
      setGeolocatedChantiers(chantierWithCoords);
      setLoading(false);
      setIsGeocoded(true);
      
      // Ajuster la vue si nous avons des coordonnées
      if (chantierWithCoords.length > 0) {
        fitMapToBounds(chantierWithCoords);
      }
      
      return;
    }

    // Géocoder en série pour respecter les limites d'API
    for (const chantier of needsGeocoding) {
      const adresse = chantier.adresseChantier || chantier.adresse;
      if (!adresse) continue;

      try {
        // Premier essai: API Nominatim
        const nominatimResult = await geocodeWithNominatim(adresse, chantier.nom);
        
        if (nominatimResult) {
          chantierWithCoords.push({
            ...chantier,
            latitude: nominatimResult.lat,
            longitude: nominatimResult.lon
          });
          continue;
        }
        
        // Second essai: API Photon
        const photonResult = await geocodeWithPhoton(adresse, chantier.nom);
        
        if (photonResult) {
          chantierWithCoords.push({
            ...chantier,
            latitude: photonResult.lat,
            longitude: photonResult.lon
          });
          continue;
        }
        
        // Fallback: position aléatoire autour de Paris pour les tests
        logger.warn(`Aucun résultat de géocodage pour: ${chantier.nom}`);
        chantierWithCoords.push({
          ...chantier,
          latitude: 48.8566 + (Math.random() * 2 - 1),
          longitude: 2.3522 + (Math.random() * 2 - 1)
        });
        
      } catch (error) {
        logger.error(`Erreur lors du géocodage pour ${chantier.nom}:`, error);
      }
      
      // Pause entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mettre à jour l'état avec les chantiers géolocalisés
    setGeolocatedChantiers(chantierWithCoords);
    setDebugInfo(prev => `${prev} | Géolocalisés: ${chantierWithCoords.length}`);
    setLoading(false);
    setIsGeocoded(true);
    
    // Ajuster la vue de la carte
    fitMapToBounds(chantierWithCoords);
    
  }, [chantiers, map, isGeocoded]);

  // Fonction pour ajuster la vue de la carte aux limites des marqueurs
  const fitMapToBounds = useCallback((chantiers: Chantier[]) => {
    try {
      const chantiersWithCoords = chantiers.filter(c => c.latitude && c.longitude);
      
      if (chantiersWithCoords.length === 0) {
        map.setView([46.603354, 1.888334], 5); // Vue par défaut: France
        return;
      }
      
      if (chantiersWithCoords.length === 1) {
        const chantier = chantiersWithCoords[0];
        map.setView([chantier.latitude!, chantier.longitude!], 10);
        return;
      }
      
      const bounds = L.latLngBounds(
        chantiersWithCoords.map(c => [c.latitude!, c.longitude!])
      );
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (error) {
      logger.error("Erreur lors de l'ajustement de la vue:", error);
      map.setView([46.603354, 1.888334], 5);
    }
  }, [map]);

  // Fonctions de géocodage
  async function geocodeWithNominatim(adresse: string, nom: string): Promise<{lat: number, lon: number} | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}&limit=1&accept-language=fr`,
        { headers: { 'User-Agent': 'SecoTech Application' } }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data || data.length === 0) return null;
      
      logger.info(`Géocodage Nominatim réussi pour: ${nom}`);
      return { 
        lat: parseFloat(data[0].lat), 
        lon: parseFloat(data[0].lon)
      };
    } catch (error) {
      logger.error(`Erreur Nominatim pour ${nom}:`, error);
      return null;
    }
  }
  
  async function geocodeWithPhoton(adresse: string, nom: string): Promise<{lat: number, lon: number} | null> {
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(adresse)}&limit=1&lang=fr`,
        { headers: { 'User-Agent': 'SecoTech Application' } }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data || !data.features || data.features.length === 0) return null;
      
      const coordinates = data.features[0].geometry.coordinates;
      logger.info(`Géocodage Photon réussi pour: ${nom}`);
      return { 
        lat: coordinates[1], 
        lon: coordinates[0] 
      };
    } catch (error) {
      logger.error(`Erreur Photon pour ${nom}:`, error);
      return null;
    }
  }

  // Effet pour déclencher le géocodage
  useEffect(() => {
    geocodeChantiers();
  }, [geocodeChantiers]);

  // Afficher un message pendant le chargement
  if (loading && geolocatedChantiers.length === 0) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white p-2 rounded shadow">
        Chargement des chantiers sur la carte...
      </div>
    );
  }

  // Afficher un message si aucun chantier n'est localisé
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
    );
  }

  // Rendu des marqueurs
  return (
    <>
      {geolocatedChantiers.map(chantier => createChantierMarker(chantier, formatMontant))}
    </>
  );
} 