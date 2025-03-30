'use client'
import { useState, useEffect } from 'react'
import { SoustraitantEtat, SoustraitantEtatSummary, AvenantSoustraitantEtat, LigneSoustraitantEtat } from '@/types/etat-avancement'
import { TrashIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface EtatAvancementSSTraitantProps {
  etatAvancement: SoustraitantEtat
  chantierId: string
  etatId: string
}

// Type simplifié pour les valeurs d'avenants éditables
interface AvenantValues {
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  quantiteActuelle: number;
}

export default function EtatAvancementSSTraitant({
  etatAvancement,
  chantierId,
  etatId,
}: EtatAvancementSSTraitantProps) {
  const router = useRouter()
  const [isEditingComments, setIsEditingComments] = useState(false)
  const [commentaires, setCommentaires] = useState(etatAvancement?.commentaires || '')
  const [summary, setSummary] = useState<SoustraitantEtatSummary>({
    totalCommandeInitiale: { precedent: 0, actuel: 0, total: 0 },
    totalAvenants: { precedent: 0, actuel: 0, total: 0 },
    totalGeneral: { precedent: 0, actuel: 0, total: 0 }
  })
  const [quantites, setQuantites] = useState<{ [key: number]: number }>({})
  const [avenants, setAvenants] = useState<AvenantSoustraitantEtat[]>([])
  const [avenantValues, setAvenantValues] = useState<{ [key: number]: AvenantValues }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Ajouter un log pour déboguer
  console.log('Avenants reçus dans EtatAvancementClient:', etatAvancement?.avenants || []);
  console.log('Commentaires reçus dans EtatAvancementClient:', etatAvancement?.commentaires || '');

  // Initialisation des données
  useEffect(() => {
    if (!etatAvancement || isInitialized) return;
    
    // Initialiser les quantités avec les valeurs actuelles
    const initialQuantites = etatAvancement?.lignes?.reduce((acc: { [key: number]: number }, ligne: LigneSoustraitantEtat) => {
      acc[ligne.id] = ligne.quantiteActuelle ?? 0
      return acc
    }, {} as { [key: number]: number }) || {}
    setQuantites(initialQuantites)

    // Initialiser les valeurs des avenants
    const initialAvenants = etatAvancement?.avenants || [];
    setAvenants(initialAvenants);
    
    const initialAvenantValues: { [key: number]: AvenantValues } = {};
    
    if (initialAvenants && Array.isArray(initialAvenants)) {
      initialAvenants.forEach((avenant: AvenantSoustraitantEtat) => {
        initialAvenantValues[avenant.id] = {
          article: avenant.article || '',
          description: avenant.description || '',
          type: avenant.type || 'QP',
          unite: avenant.unite || 'U',
          prixUnitaire: avenant.prixUnitaire ?? 0,
          quantite: avenant.quantite ?? 0,
          quantiteActuelle: avenant.quantiteActuelle ?? 0
        };
      });
      
      console.log('Valeurs initiales des avenants:', initialAvenantValues);
      setAvenantValues(initialAvenantValues);
      setIsInitialized(true);
    }
    
    // Mettre à jour les commentaires
    setCommentaires(etatAvancement.commentaires || '');
  }, [etatAvancement, isInitialized]);

  // Calcul des valeurs dérivées pour les lignes
  const calculatedLignes = etatAvancement?.lignes?.map((ligne: LigneSoustraitantEtat) => {
    const quantiteActuelle = quantites[ligne.id] ?? ligne.quantiteActuelle
    const quantiteTotale = quantiteActuelle + ligne.quantitePrecedente
    const montantActuel = quantiteActuelle * ligne.prixUnitaire
    const montantTotal = montantActuel + ligne.montantPrecedent

    return {
      ...ligne,
      quantiteActuelle,
      quantiteTotale,
      montantActuel,
      montantTotal
    }
  })

  // Calcul des valeurs dérivées pour les avenants
  const calculatedAvenants = avenants?.map((avenant: AvenantSoustraitantEtat) => {
    const values = avenantValues[avenant.id] ?? {
      article: avenant.article || '',
      description: avenant.description || '',
      type: avenant.type || 'QP',
      unite: avenant.unite || 'U',
      prixUnitaire: avenant.prixUnitaire || 0,
      quantite: avenant.quantite || 0,
      quantiteActuelle: avenant.quantiteActuelle || 0
    };
    const quantiteActuelle = values.quantiteActuelle || 0;
    const quantiteTotale = quantiteActuelle + avenant.quantitePrecedente;
    const prixUnitaire = values.prixUnitaire || 0;
    const montantActuel = quantiteActuelle * prixUnitaire;
    const montantTotal = montantActuel + avenant.montantPrecedent;

    return {
      ...avenant,
      ...values,
      quantiteTotale,
      montantActuel,
      montantTotal
    }
  })

  // Calcul des totaux à partir des valeurs calculées
  const totalCommandeInitiale = {
    precedent: calculatedLignes?.reduce((sum: number, ligne: LigneSoustraitantEtat) => sum + ligne.montantPrecedent, 0) || 0,
    actuel: calculatedLignes?.reduce((sum: number, ligne: LigneSoustraitantEtat) => sum + ligne.montantActuel, 0) || 0,
    total: calculatedLignes?.reduce((sum: number, ligne: LigneSoustraitantEtat) => sum + ligne.montantTotal, 0) || 0
  }

  const totalAvenants = {
    precedent: calculatedAvenants?.reduce((sum: number, avenant: AvenantSoustraitantEtat) => sum + avenant.montantPrecedent, 0) || 0,
    actuel: calculatedAvenants?.reduce((sum: number, avenant: AvenantSoustraitantEtat) => sum + avenant.montantActuel, 0) || 0,
    total: calculatedAvenants?.reduce((sum: number, avenant: AvenantSoustraitantEtat) => sum + avenant.montantTotal, 0) || 0
  }

  // Mettre à jour les totaux à chaque changement de quantités ou avenants
  useEffect(() => {
    // Calculer les totaux
    const totalCommandeInitiale = {
      precedent: calculatedLignes?.reduce((sum: number, ligne: LigneSoustraitantEtat) => sum + ligne.montantPrecedent, 0) || 0,
      actuel: calculatedLignes?.reduce((sum: number, ligne: LigneSoustraitantEtat) => sum + ligne.montantActuel, 0) || 0,
      total: calculatedLignes?.reduce((sum: number, ligne: LigneSoustraitantEtat) => sum + ligne.montantTotal, 0) || 0
    }

    const totalAvenants = {
      precedent: calculatedAvenants?.reduce((sum: number, avenant: AvenantSoustraitantEtat) => sum + avenant.montantPrecedent, 0) || 0,
      actuel: calculatedAvenants?.reduce((sum: number, avenant: AvenantSoustraitantEtat) => sum + avenant.montantActuel, 0) || 0,
      total: calculatedAvenants?.reduce((sum: number, avenant: AvenantSoustraitantEtat) => sum + avenant.montantTotal, 0) || 0
    }

    setSummary({
      totalCommandeInitiale,
      totalAvenants,
      totalGeneral: {
        precedent: totalCommandeInitiale.precedent + totalAvenants.precedent,
        actuel: totalCommandeInitiale.actuel + totalAvenants.actuel,
        total: totalCommandeInitiale.total + totalAvenants.total
      }
    })
  }, [quantites, avenantValues, etatAvancement?.lignes, avenants]) // Dépendances stables

  const handleQuantiteActuelleChange = async (ligneId: number, nouvelleQuantite: number) => {
    try {
      // Mettre immédiatement à jour l'état local pour un retour visuel immédiat
      setQuantites(prev => ({
        ...prev,
        [ligneId]: nouvelleQuantite
      }))

      const ligne = etatAvancement.lignes.find((l: LigneSoustraitantEtat) => l.id === ligneId)
      if (!ligne) {
        throw new Error('Ligne non trouvée')
      }

      // Calculer les valeurs dérivées
      const montantActuel = nouvelleQuantite * ligne.prixUnitaire
      const montantTotal = montantActuel + ligne.montantPrecedent
      
      // Enregistrer temporairement la valeur exacte pour le dernier changement
      const quantiteExacte = nouvelleQuantite;
      
      console.log(`Enregistrement de la quantité: ${quantiteExacte} pour la ligne ${ligneId}`);

      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${etatAvancement.soustraitantId}/etats-avancement/${etatId}/lignes/${ligneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantiteActuelle: quantiteExacte,
          quantiteTotale: quantiteExacte + ligne.quantitePrecedente,
          montantActuel: montantActuel,
          montantTotal: montantTotal
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('Erreur serveur:', errorData)
        
        // En cas d'erreur, restaurer l'ancienne valeur
        setQuantites(prev => ({
          ...prev,
          [ligneId]: ligne.quantiteActuelle || 0
        }))
        throw new Error(errorData?.message || 'Erreur lors de la mise à jour de la quantité')
      }
      
      // Si la requête est réussie, s'assurer que l'état local est correct
      // Cela garantit que la valeur affichée correspond exactement à ce qui a été envoyé
      setQuantites(prev => ({
        ...prev,
        [ligneId]: quantiteExacte
      }))

      // Attendre un moment pour s'assurer que la mise à jour a bien eu lieu avant de rafraîchir
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (error) {
      console.error('Erreur détaillée:', error)
      toast.error('Erreur lors de la mise à jour de la quantité')
    }
  }

  const handleAddAvenant = async () => {
    try {
      // Créer un nouvel avenant localement
      const newAvenant: AvenantSoustraitantEtat = {
        id: Date.now(), // ID temporaire pour l'état local
        soustraitantEtatId: parseInt(etatId),
        article: '',
        description: '',
        type: 'QP',
        unite: 'U',
        prixUnitaire: 0,
        quantite: 0,
        quantitePrecedente: 0,
        quantiteActuelle: 0,
        quantiteTotale: 0,
        montantPrecedent: 0,
        montantActuel: 0,
        montantTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mettre à jour l'état local
      const updatedAvenants = [...avenants, newAvenant];
      setAvenants(updatedAvenants);
      
      setAvenantValues({
        ...avenantValues,
        [newAvenant.id]: {
          article: newAvenant.article,
          description: newAvenant.description,
          type: newAvenant.type,
          unite: newAvenant.unite,
          prixUnitaire: newAvenant.prixUnitaire,
          quantite: newAvenant.quantite,
          quantiteActuelle: newAvenant.quantiteActuelle
        }
      });

      // Envoyer les données au serveur
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${etatAvancement.soustraitantId}/etats-avancement/${etatId}/avenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAvenant),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout de l\'avenant');
      }

      // Récupérer l'avenant avec l'ID réel du serveur
      const serverAvenant = await response.json();
      
      // Mise à jour de la liste des avenants avec l'ID réel
      const finalAvenants = avenants.filter(a => a.id !== newAvenant.id);
      finalAvenants.push(serverAvenant);
      setAvenants(finalAvenants);
      
      // Mettre à jour les valeurs d'avenant avec l'ID réel
      const updatedValues = { ...avenantValues };
      delete updatedValues[newAvenant.id];
      updatedValues[serverAvenant.id] = {
        article: serverAvenant.article,
        description: serverAvenant.description,
        type: serverAvenant.type,
        unite: serverAvenant.unite,
        prixUnitaire: serverAvenant.prixUnitaire,
        quantite: serverAvenant.quantite,
        quantiteActuelle: serverAvenant.quantiteActuelle
      };
      setAvenantValues(updatedValues);

      toast.success('Avenant ajouté avec succès');
      router.refresh();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'ajout de l\'avenant');
    }
  };

  const handleAvenantChange = async (avenantId: number, field: string, value: string | number) => {
    try {
      // Mettre à jour l'état local immédiatement
      setAvenantValues(prev => {
        const newValues = { ...prev };
        if (newValues[avenantId]) {
          newValues[avenantId] = {
            ...newValues[avenantId],
            [field]: value
          };
        }
        return newValues;
      });

      const avenant = avenants.find((a: AvenantSoustraitantEtat) => a.id === avenantId)
      if (!avenant) {
        throw new Error('Avenant non trouvé')
      }

      // Récupérer les valeurs mises à jour
      const currentValues = avenantValues[avenantId] || {
        article: avenant.article || '',
        description: avenant.description || '',
        type: avenant.type || 'QP',
        unite: avenant.unite || 'U',
        prixUnitaire: avenant.prixUnitaire || 0,
        quantite: avenant.quantite || 0,
        quantiteActuelle: avenant.quantiteActuelle || 0
      };
      
      // Sauvegarder les valeurs exactes avant l'envoi
      const updatedValues = {
        ...currentValues,
        [field]: value
      };

      // Calculer les valeurs dérivées
      const quantiteActuelle = updatedValues.quantiteActuelle !== undefined ? updatedValues.quantiteActuelle : 0;
      const prixUnitaire = updatedValues.prixUnitaire !== undefined ? updatedValues.prixUnitaire : 0;
      const montantActuel = quantiteActuelle * prixUnitaire;
      const montantTotal = montantActuel + avenant.montantPrecedent;
      
      // Log des valeurs avant envoi pour déboguer
      console.log(`Mise à jour de l'avenant ${avenantId}, champ ${field}, valeur: ${value}`, updatedValues);

      // Préparer les données pour l'API
      const dataToUpdate = {
        ...updatedValues,
        quantiteTotale: quantiteActuelle + avenant.quantitePrecedente,
        montantActuel,
        montantTotal
      };

      // Envoyer les données au serveur
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${etatAvancement.soustraitantId}/etats-avancement/${etatId}/avenants/${avenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToUpdate),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'avenant')
      }

      // Mettre à jour l'état local avec les données du serveur mais en conservant les valeurs exactes envoyées
      const updatedAvenant = await response.json();
      
      // S'assurer que les valeurs exactes sont conservées
      setAvenantValues(prev => {
        const exactValues = { ...prev };
        if (exactValues[avenantId]) {
          // Conserver les valeurs exactes entrées par l'utilisateur
          exactValues[avenantId] = {
            ...updatedValues
          };
        }
        return exactValues;
      });
      
      setAvenants(prev => prev.map((a: AvenantSoustraitantEtat) => a.id === avenantId ? {
        ...updatedAvenant,
        // S'assurer que les valeurs numériques sont exactement celles envoyées
        prixUnitaire: field === 'prixUnitaire' ? updatedValues.prixUnitaire : updatedAvenant.prixUnitaire,
        quantite: field === 'quantite' ? updatedValues.quantite : updatedAvenant.quantite,
        quantiteActuelle: field === 'quantiteActuelle' ? updatedValues.quantiteActuelle : updatedAvenant.quantiteActuelle
      } : a));

      // Attendre un moment pour s'assurer que la mise à jour a bien eu lieu avant de rafraîchir
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour de l\'avenant')
    }
  }

  const handleSaveComments = async () => {
    try {
      console.log('Sauvegarde des commentaires:', commentaires);
      
      // Désactiver l'édition pendant la sauvegarde
      setIsEditingComments(false);
      
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${etatAvancement.soustraitantId}/etats-avancement/${etatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentaires,
          estFinalise: etatAvancement.estFinalise // Conserver l'état de finalisation
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des commentaires')
      }

      const updatedEtat = await response.json();
      console.log('État mis à jour avec commentaires:', updatedEtat.commentaires);

      // Mettre à jour l'état local avec les nouvelles valeurs
      setCommentaires(updatedEtat.commentaires || '');
      
      // Afficher un message de succès
      toast.success('Commentaires enregistrés avec succès');
      
      // Au lieu de recharger toute la page, nous pouvons simplement rafraîchir les données
      // en utilisant router.refresh() qui est plus léger et préserve l'état du composant
      router.refresh();
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour des commentaires')
      // Réactiver l'édition en cas d'erreur
      setIsEditingComments(true);
    }
  }

  const handleDeleteAvenant = async (avenantId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avenant ?')) {
      return
    }

    try {
      setIsLoading(true)
      
      // Filtrer l'avenant à supprimer de la liste
      const updatedAvenants = avenants.filter((a: AvenantSoustraitantEtat) => a.id !== avenantId);
      
      // Mettre à jour l'état local
      setAvenants(updatedAvenants);
      
      // Supprimer l'avenant du serveur
      const response = await fetch(
        `/api/chantiers/${chantierId}/soustraitants/${etatAvancement.soustraitantId}/etats-avancement/${etatId}/avenants?avenantId=${avenantId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erreur lors de la suppression de l\'avenant')
        // Restaurer l'état précédent en cas d'erreur
        setAvenants(avenants);
        return
      }
      
      // Nettoyer les valeurs d'avenant
      const updatedValues = { ...avenantValues };
      delete updatedValues[avenantId];
      setAvenantValues(updatedValues);
      
      toast.success('Avenant supprimé avec succès')
      router.refresh()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de l\'avenant')
      // Restaurer l'état précédent en cas d'erreur
      setAvenants(avenants);
    } finally {
      setIsLoading(false)
    }
  }

  const handleCalculateSummary = (avenants: AvenantSoustraitantEtat[]): SoustraitantEtatSummary => {
    return avenants.reduce((acc: SoustraitantEtatSummary, avenant: AvenantSoustraitantEtat) => {
      // Calculs pour acc
      return acc;
    }, {
      totalCommandeInitiale: { precedent: 0, actuel: 0, total: 0 },
      totalAvenants: { precedent: 0, actuel: 0, total: 0 },
      totalGeneral: { precedent: 0, actuel: 0, total: 0 }
    });
  }

  return (
    <div className="space-y-8 w-full">
      {/* Tableau du bordereau de commande */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Bordereau de commande initial
          </h2>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="w-24 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Art.</th>
                  <th className="w-96 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Desc.</th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Type</th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Un.</th>
                  <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">P.U.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté</th>
                  <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Total</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté P.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 border-l border-gray-300 dark:border-gray-600 font-bold">Qté A.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté T.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Mt. P.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20">Mt. A.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Mt. T.</th>
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {calculatedLignes?.map((ligne: LigneSoustraitantEtat) => (
                  <tr key={ligne.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">{ligne.article}</td>
                    <td className="w-96 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">{ligne.description}</td>
                    <td className="w-16 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">{ligne.type}</td>
                    <td className="w-16 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">{ligne.unite}</td>
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">{ligne.prixUnitaire.toLocaleString('fr-FR')} €</td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">{ligne.quantite}</td>
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {(ligne.prixUnitaire * ligne.quantite).toLocaleString('fr-FR')} €
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {ligne.quantitePrecedente}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right bg-blue-50 dark:bg-blue-900/10 border-l border-gray-300 dark:border-gray-600">
                      {!etatAvancement.estFinalise ? (
                        <input
                          type="number"
                          value={quantites[ligne.id] === 0 ? "0" : quantites[ligne.id]?.toString() || "0"}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            if (!isNaN(value)) {
                              handleQuantiteActuelleChange(ligne.id, value)
                            }
                          }}
                          className="w-16 text-right border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      ) : (
                        ligne.quantiteActuelle
                      )}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {ligne.quantiteTotale}
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {ligne.montantPrecedent.toLocaleString('fr-FR')} €
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right bg-blue-50 dark:bg-blue-900/10">
                      {ligne.montantActuel.toLocaleString('fr-FR')} €
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {ligne.montantTotal.toLocaleString('fr-FR')} €
                    </td>
                    <td className="w-10 px-2 py-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tableau des avenants */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Avenants
          </h2>
          {!etatAvancement.estFinalise && (
            <button
              onClick={handleAddAvenant}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 flex items-center text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Ajouter un avenant
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="w-24 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Art.</th>
                  <th className="w-96 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Desc.</th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Type</th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Un.</th>
                  <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">P.U.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté</th>
                  <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Total</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté P.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 border-l border-gray-300 dark:border-gray-600 font-bold">Qté A.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté T.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Mt. P.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20">Mt. A.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Mt. T.</th>
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {calculatedAvenants?.map((avenant: AvenantSoustraitantEtat) => (
                  <tr key={avenant.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">
                      {!etatAvancement.estFinalise ? (
                        <input
                          type="text"
                          value={avenantValues[avenant.id]?.article ?? ''}
                          onChange={(e) => handleAvenantChange(avenant.id, 'article', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        />
                      ) : (
                        avenant.article
                      )}
                    </td>
                    <td className="w-96 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">
                      {!etatAvancement.estFinalise ? (
                        <input
                          type="text"
                          value={avenantValues[avenant.id]?.description ?? ''}
                          onChange={(e) => handleAvenantChange(avenant.id, 'description', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        />
                      ) : (
                        avenant.description
                      )}
                    </td>
                    <td className="w-16 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">
                      {!etatAvancement.estFinalise ? (
                        <select
                          value={avenantValues[avenant.id]?.type ?? 'QP'}
                          onChange={(e) => handleAvenantChange(avenant.id, 'type', e.target.value)}
                          className="border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        >
                          <option value="QP">QP</option>
                          <option value="TS">TS</option>
                          <option value="TF">TF</option>
                        </select>
                      ) : (
                        avenant.type
                      )}
                    </td>
                    <td className="w-16 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">
                      {!etatAvancement.estFinalise ? (
                        <input
                          type="text"
                          value={avenantValues[avenant.id]?.unite ?? 'U'}
                          onChange={(e) => handleAvenantChange(avenant.id, 'unite', e.target.value)}
                          className="w-16 border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        />
                      ) : (
                        avenant.unite
                      )}
                    </td>
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {!etatAvancement.estFinalise ? (
                        <div className="flex items-center justify-end space-x-1">
                          <input
                            type="number"
                            value={(avenantValues[avenant.id]?.prixUnitaire === 0 || avenantValues[avenant.id]?.prixUnitaire === undefined) ? "0" : avenantValues[avenant.id]?.prixUnitaire.toString()}
                            onChange={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                              if (!isNaN(value)) {
                                handleAvenantChange(avenant.id, 'prixUnitaire', value)
                              }
                            }}
                            className="w-20 text-right border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                          />
                          <span>€</span>
                        </div>
                      ) : (
                        <>{avenant.prixUnitaire.toLocaleString('fr-FR')} €</>
                      )}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {!etatAvancement.estFinalise ? (
                        <input
                          type="number"
                          value={(avenantValues[avenant.id]?.quantite === 0 || avenantValues[avenant.id]?.quantite === undefined) ? "0" : avenantValues[avenant.id]?.quantite.toString()}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            if (!isNaN(value)) {
                              handleAvenantChange(avenant.id, 'quantite', value)
                            }
                          }}
                          className="w-20 text-right border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      ) : (
                        avenant.quantite
                      )}
                    </td>
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {((avenantValues[avenant.id]?.prixUnitaire ?? avenant.prixUnitaire) * 
                        (avenantValues[avenant.id]?.quantite ?? avenant.quantite)).toLocaleString('fr-FR')} €
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {avenant.quantitePrecedente}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right bg-blue-50 dark:bg-blue-900/10 border-l border-gray-300 dark:border-gray-600">
                      {!etatAvancement.estFinalise ? (
                        <input
                          type="number"
                          value={(avenantValues[avenant.id]?.quantiteActuelle === 0 || avenantValues[avenant.id]?.quantiteActuelle === undefined) ? "0" : avenantValues[avenant.id]?.quantiteActuelle.toString()}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value)
                            if (!isNaN(value)) {
                              handleAvenantChange(avenant.id, 'quantiteActuelle', value)
                            }
                          }}
                          className="w-20 text-right border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      ) : (
                        avenant.quantiteActuelle
                      )}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {calculatedAvenants.find((a: AvenantSoustraitantEtat) => a.id === avenant.id)?.quantiteTotale}
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {avenant.montantPrecedent.toLocaleString('fr-FR')} €
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right bg-blue-50 dark:bg-blue-900/10">
                      {calculatedAvenants.find((a: AvenantSoustraitantEtat) => a.id === avenant.id)?.montantActuel.toLocaleString('fr-FR')} €
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {calculatedAvenants.find((a: AvenantSoustraitantEtat) => a.id === avenant.id)?.montantTotal.toLocaleString('fr-FR')} €
                    </td>
                    <td className="w-10 px-2 py-3">
                      {!etatAvancement.estFinalise && (
                        <button
                          onClick={() => handleDeleteAvenant(avenant.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section commentaires */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-red-200 dark:border-red-700 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Commentaires
          </h2>
          {!etatAvancement.estFinalise && (
            isEditingComments ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveComments}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => {
                    setCommentaires(etatAvancement.commentaires || '')
                    setIsEditingComments(false)
                  }}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingComments(true)}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 flex items-center text-sm"
              >
                <PencilSquareIcon className="h-4 w-4 mr-1" />
                Modifier
              </button>
            )
          )}
        </div>
        <div className="p-6 bg-white dark:bg-gray-800">
          {isEditingComments ? (
            <textarea
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              className="w-full h-32 p-4 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Saisissez vos commentaires ici..."
            />
          ) : (
            <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[5rem] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
              {commentaires || 'Aucun commentaire'}
            </div>
          )}
        </div>
      </div>

      {/* Récapitulatif des totaux */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-green-200 dark:border-green-700 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Récapitulatif
          </h2>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200"></th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Montant précédent</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Montant actuel</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Montant total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">Total commande initiale</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{summary.totalCommandeInitiale.precedent.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{summary.totalCommandeInitiale.actuel.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{summary.totalCommandeInitiale.total.toLocaleString('fr-FR')} €</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">Total avenants</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{summary.totalAvenants.precedent.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{summary.totalAvenants.actuel.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{summary.totalAvenants.total.toLocaleString('fr-FR')} €</td>
                </tr>
                <tr className="bg-green-50 dark:bg-green-900/20 font-bold">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200">TOTAL GÉNÉRAL</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200 text-right">{summary.totalGeneral.precedent.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200 text-right bg-green-100 dark:bg-green-900/30 border-2 border-green-600 dark:border-green-400">{summary.totalGeneral.actuel.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200 text-right">{summary.totalGeneral.total.toLocaleString('fr-FR')} €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 