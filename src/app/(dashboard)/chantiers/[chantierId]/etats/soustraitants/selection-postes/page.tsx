'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface LigneCommande {
  id: number;
  commandeId: number;
  ordre: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
}

interface Commande {
  id: number;
  reference: string;
  lignes: LigneCommande[];
}

export default function SelectionPostesPage() {
  const { chantierId } = useParams();
  const searchParams = useSearchParams();
  const soustraitantId = searchParams.get('soustraitantId');
  const router = useRouter();
  
  const [commande, setCommande] = useState<Commande | null>(null);
  const [selectedLignes, setSelectedLignes] = useState<Map<number, LigneCommande>>(new Map());
  const [modifiedLignes, setModifiedLignes] = useState<Map<number, { quantite: number, prixUnitaire: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!soustraitantId) {
      toast.error('ID du sous-traitant manquant');
      router.push(`/chantiers/${chantierId}/etats/soustraitants`);
      return;
    }
    
    const fetchCommande = async () => {
      try {
        setLoading(true);
        // Récupérer la commande client validée
        const response = await fetch(`/api/chantiers/${chantierId}/commande`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Aucune commande validée trouvée pour ce chantier');
          } else {
            toast.error('Erreur lors de la récupération de la commande client');
          }
          return;
        }
        
        const data = await response.json();
        setCommande(data);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCommande();
  }, [chantierId, soustraitantId, router]);

  const handleSelectLigne = (ligne: LigneCommande) => {
    const newSelectedLignes = new Map(selectedLignes);
    
    if (newSelectedLignes.has(ligne.id)) {
      newSelectedLignes.delete(ligne.id);
      
      // Supprimer également des lignes modifiées
      const newModifiedLignes = new Map(modifiedLignes);
      newModifiedLignes.delete(ligne.id);
      setModifiedLignes(newModifiedLignes);
    } else {
      newSelectedLignes.set(ligne.id, ligne);
      
      // Initialiser avec les valeurs actuelles
      if (!modifiedLignes.has(ligne.id)) {
        const newModifiedLignes = new Map(modifiedLignes);
        newModifiedLignes.set(ligne.id, {
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire
        });
        setModifiedLignes(newModifiedLignes);
      }
    }
    
    setSelectedLignes(newSelectedLignes);
  };

  const handleQuantiteChange = (ligneId: number, value: string) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const currentValues = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: 0 };
    
    newModifiedLignes.set(ligneId, {
      ...currentValues,
      quantite: value === '' ? 0 : parseFloat(value)
    });
    
    setModifiedLignes(newModifiedLignes);
  };

  const handlePrixChange = (ligneId: number, value: string) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const currentValues = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: 0 };
    
    newModifiedLignes.set(ligneId, {
      ...currentValues,
      prixUnitaire: value === '' ? 0 : parseFloat(value)
    });
    
    setModifiedLignes(newModifiedLignes);
  };

  const handleSubmit = async () => {
    if (selectedLignes.size === 0) {
      toast.error('Veuillez sélectionner au moins un poste');
      return;
    }

    try {
      setSubmitting(true);
      
      // Préparer les lignes pour la création de la commande sous-traitant
      const lignesArray = Array.from(selectedLignes.values()).map(ligne => {
        const modifiedValues = modifiedLignes.get(ligne.id);
        return {
          article: ligne.article,
          description: ligne.description,
          type: ligne.type,
          unite: ligne.unite,
          prixUnitaire: modifiedValues?.prixUnitaire || ligne.prixUnitaire,
          quantite: modifiedValues?.quantite || ligne.quantite
        };
      });
      
      // Créer la commande sous-traitant
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/commandes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lignes: lignesArray,
          reference: commande?.reference || `Commande ST - ${new Date().toISOString().split('T')[0]}`,
          tauxTVA: 20 // Valeur par défaut, peut être modifiée si nécessaire
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la commande sous-traitant');
      }
      
      const result = await response.json();
      
      toast.success('Commande sous-traitant créée avec succès');
      // Rediriger vers la page de détail de la commande sous-traitant
      router.push(`/chantiers/${chantierId}/etats/soustraitants/${soustraitantId}/commande/${result.id}`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création de la commande sous-traitant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/chantiers/${chantierId}/etats/soustraitants`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href={`/chantiers/${chantierId}/etats/soustraitants`} className="mr-4">
            <Button variant="outline">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Sélection des postes pour sous-traitants</h1>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Postes disponibles - Commande client</CardTitle>
        </CardHeader>
        <CardContent>
          {!commande ? (
            <p className="text-red-500">Aucune commande client validée trouvée pour ce chantier</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="p-2 text-left">Sélection</th>
                      <th className="p-2 text-left">Article</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Unité</th>
                      <th className="p-2 text-left">Quantité</th>
                      <th className="p-2 text-left">Prix unitaire (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commande.lignes.map((ligne) => (
                      <tr 
                        key={ligne.id} 
                        className={`border-b hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedLignes.has(ligne.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <td className="p-2">
                          <input 
                            type="checkbox" 
                            checked={selectedLignes.has(ligne.id)}
                            onChange={() => handleSelectLigne(ligne)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                        </td>
                        <td className="p-2">{ligne.article}</td>
                        <td className="p-2">{ligne.description}</td>
                        <td className="p-2">{ligne.type}</td>
                        <td className="p-2">{ligne.unite}</td>
                        <td className="p-2">
                          {selectedLignes.has(ligne.id) ? (
                            <input 
                              type="number" 
                              value={modifiedLignes.get(ligne.id)?.quantite || ''}
                              onChange={(e) => handleQuantiteChange(ligne.id, e.target.value)}
                              className="w-full p-1 border rounded"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            ligne.quantite
                          )}
                        </td>
                        <td className="p-2">
                          {selectedLignes.has(ligne.id) ? (
                            <input 
                              type="number" 
                              value={modifiedLignes.get(ligne.id)?.prixUnitaire || ''}
                              onChange={(e) => handlePrixChange(ligne.id, e.target.value)}
                              className="w-full p-1 border rounded"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            ligne.prixUnitaire
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between mt-6">
                <div>
                  <p>Postes sélectionnés: {selectedLignes.size}</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={selectedLignes.size === 0 || submitting}
                  >
                    {submitting ? 'Création...' : 'Créer la commande sous-traitant'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 