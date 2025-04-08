'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Importer les styles CSS de Leaflet
if (typeof window !== 'undefined') {
  try {
    require('leaflet/dist/leaflet.css')
    require('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css')
  } catch (error) {
    console.error('Erreur lors du chargement des styles Leaflet:', error)
  }
}

// Définir les types
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

interface DynamicChantiersMapProps {
  chantiers: Chantier[]
  loading?: boolean
}

// Composant de chargement séparé
function MapLoading() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Chantiers en cours</h3>
      </div>
      <div className="p-4 relative" style={{ height: '500px' }}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Initialisation de la carte...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant d'erreur
function MapError({ error }: { error: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Carte des chantiers</h3>
      </div>
      <div className="p-4 relative" style={{ height: '500px' }}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">Impossible de charger la carte</p>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Consultez vos chantiers dans la liste</p>
            <div className="mt-4 text-xs text-gray-500">{error}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Importation dynamique avec lazy loading et fallback
const LazyMap = dynamic(
  () => import('./ChantiersMap').catch(() => {
    console.error("Erreur lors du chargement du composant ChantiersMap");
    return () => <MapError error="Impossible de charger la carte" />;
  }),
  { 
    ssr: false,
    loading: () => <MapLoading />
  }
);

export default function DynamicChantiersMap({ chantiers, loading = false }: DynamicChantiersMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier si on est côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Gestion des erreurs globales de Leaflet
  useEffect(() => {
    if (!isClient) return;

    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message && (
        event.message.includes('Leaflet') || 
        event.message.includes('map') ||
        event.message.includes('L is not defined')
      )) {
        console.error('Erreur Leaflet détectée:', event);
        setError(event.message);
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, [isClient]);

  // Si on n'est pas côté client ou en chargement
  if (!isClient || loading) {
    return <MapLoading />;
  }

  // Si une erreur a été détectée
  if (error) {
    return <MapError error={error} />;
  }

  // Statistiques de débogage
  const chantiersAvecCoords = chantiers.filter(c => c.latitude && c.longitude);
  const chantiersEnCours = chantiers.filter(c => c.etat === "En cours");
  const debugInfo = `Total: ${chantiers.length}, En cours: ${chantiersEnCours.length}, Avec coords: ${chantiersAvecCoords.length}`;

  // Rendu de la carte
  return (
    <div>
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        {debugInfo}
      </div>
      <LazyMap chantiers={chantiers} loading={false} />
    </div>
  );
} 