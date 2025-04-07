'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'

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

// Importation totalement dynamique de la carte avec NoSSR
// Cela garantit que Leaflet n'est jamais exécuté côté serveur
const ChantiersMapNoSSR = dynamic(
  () => import('./ChantiersMap'), 
  {
    ssr: false,
    loading: () => <MapLoading />
  }
);

export default function DynamicChantiersMap({ chantiers, loading = false }: DynamicChantiersMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [mountKey, setMountKey] = useState(Date.now().toString());
  const [debugInfo, setDebugInfo] = useState('');

  // N'afficher la carte qu'après le montage du composant (côté client uniquement)
  useEffect(() => {
    setIsMounted(true);
    
    // Mettre à jour les informations de débogage
    const chantiersAvecCoords = chantiers.filter(c => c.latitude && c.longitude);
    const chantiersEnCours = chantiers.filter(c => c.etat === "En cours");
    setDebugInfo(`Total: ${chantiers.length}, En cours: ${chantiersEnCours.length}, Avec coords: ${chantiersAvecCoords.length}`);
    
    // Force remounting in case of errors
    const handleError = () => {
      setMountKey(Date.now().toString());
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, [chantiers]);

  // Si encore dans l'état de chargement ou non monté, afficher l'indicateur
  if (!isMounted || loading) {
    return <MapLoading />;
  }

  // Une fois prêt, afficher la carte avec une clé unique pour forcer un montage propre
  return (
    <div key={mountKey}>
      {/* Afficher les informations de débogage */}
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        {debugInfo}
      </div>
      <ChantiersMapNoSSR chantiers={chantiers} loading={false} />
    </div>
  );
} 