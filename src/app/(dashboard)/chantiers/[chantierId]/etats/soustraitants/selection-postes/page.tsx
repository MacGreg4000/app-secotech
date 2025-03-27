'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';

/**
 * Page de sélection des postes pour un sous-traitant
 * Permet d'associer des postes de travail à un sous-traitant
 * pour un état d'avancement spécifique
 */
export default function SelectionPostesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const soustraitantId = searchParams.get('soustraitantId');
  
  const [loading, setLoading] = useState(true);
  const [soustraitant, setSoustraitant] = useState<any>(null);
  const [postes, setPostes] = useState<any[]>([]);
  
  useEffect(() => {
    if (!soustraitantId) {
      toast.error('ID du sous-traitant manquant');
      return;
    }
    
    // Cette fonction serait implémentée pour charger les données nécessaires
    const loadData = async () => {
      try {
        // Charger les informations du sous-traitant et des postes disponibles
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données');
        setLoading(false);
      }
    };
    
    loadData();
  }, [soustraitantId]);
  
  const handleRetour = () => {
    router.back();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <Toaster position="top-right" />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sélection des postes pour le sous-traitant
          </h1>
          <button
            onClick={handleRetour}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Retour
          </button>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 mb-6 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-700 dark:text-blue-300">
              Cette fonctionnalité est en cours de développement. Elle permettra bientôt de sélectionner les postes de travail assignés à un sous-traitant pour les états d'avancement.
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            ID du sous-traitant: <span className="font-medium">{soustraitantId}</span>
          </p>
          
          {/* Ici viendrait la liste des postes disponibles et un formulaire de sélection */}
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
            <p className="text-center text-gray-500 dark:text-gray-400">
              L'interface de sélection des postes sera bientôt disponible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 