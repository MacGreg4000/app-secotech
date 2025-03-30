'use client'
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { type Chantier } from '@/types/chantier'
import { 
  PlusIcon,
  EyeIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
  ChevronDoubleRightIcon
} from '@heroicons/react/24/outline'
import { EtatAvancement, SoustraitantEtat } from '@/types/etat-avancement'
import { CollapsibleSection } from '@/components/CollapsibleSection'
import Link from 'next/link'
import SousTraitantSelectModal from '@/components/SousTraitantSelectModal'
import { toast, Toaster } from 'react-hot-toast'
import { DepenseSection } from '@/components'
import CardFinancialSummary from '@/components/CardFinancialSummary'
import React from 'react'

// Type étendu pour gérer à la fois les états d'avancement client et sous-traitant
interface EtatAvancementEtendu extends EtatAvancement {
  typeSoustraitant?: boolean;
  soustraitantId?: string;
}

interface SousTraitant {
  id?: string;
  soustraitantId: string;
  nom: string;
  etatsAvancement: EtatAvancementEtendu[];
  commande: {
    id: string | number;
    reference?: string;
    dateCommande: string;
    total: number;
    estVerrouillee: boolean;
  };
}

interface CommandeSousTraitant {
  id: number
  soustraitantId: string
  soustraitantNom: string
  reference: string
  dateCommande: string
  total: number
  estVerrouillee: boolean
}

interface PageProps {
  params: Promise<{
    chantierId: string
  }>
}

export default function ChantierEtatsPage(props: PageProps) {
  const params = use(props.params);
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [chantier, setChantier] = useState<any>(null)
  const [etatsAvancement, setEtatsAvancement] = useState<EtatAvancement[]>([])
  const [sousTraitants, setSousTraitants] = useState<SousTraitant[]>([])
  const [selectedSoustraitant, setSelectedSoustraitant] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('etats')
  const [isCreating, setIsCreating] = useState(false)
  const [chantierId, setChantierId] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Attendre les paramètres de route
  useEffect(() => {
    const initParams = async () => {
      const awaitedParams = await params;
      setChantierId(awaitedParams.chantierId);
    };
    
    initParams();
  }, [params]);

  // Charger les données du chantier et des états d'avancement
  useEffect(() => {
    if (!session || !chantierId || dataLoaded) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Récupérer les informations du chantier
        const chantierPromise = fetch(`/api/chantiers/${chantierId}`)
          .then(res => {
            if (!res.ok) throw new Error('Erreur lors de la récupération du chantier');
            return res.json();
          });
        
        // Récupérer les états d'avancement client
        const etatsPromise = fetch(`/api/chantiers/${chantierId}/etats-avancement`)
          .then(res => {
            if (!res.ok) throw new Error('Erreur lors de la récupération des états d\'avancement');
            return res.json();
          });
        
        // Récupérer les sous-traitants et leurs commandes
        const commandesPromise = fetch(`/api/chantiers/${chantierId}/soustraitants/commandes`)
          .then(res => {
            if (!res.ok) throw new Error('Erreur lors de la récupération des commandes des sous-traitants');
            return res.json();
          });
        
        // Attendre que toutes les requêtes principales soient terminées
        const [chantierData, etatData, commandesData] = await Promise.all([
          chantierPromise,
          etatsPromise,
          commandesPromise
        ]);
        
        setChantier(chantierData);
        setEtatsAvancement(etatData);
        
        // Pour chaque sous-traitant avec commande, récupérer les états d'avancement en parallèle
        const etatsPromises = commandesData.map(async (commande: CommandeSousTraitant) => {
          try {
            const etatsResponse = await fetch(`/api/chantiers/${chantierId}/soustraitants/${commande.soustraitantId}/etats-avancement`);
            
            if (etatsResponse.ok) {
              const etatsData = await etatsResponse.json();
              
              // Ajouter les propriétés typeSoustraitant et soustraitantId à chaque état
              const etatsAvecType = etatsData.map((etat: EtatAvancement) => ({
                ...etat,
                typeSoustraitant: true,
                soustraitantId: commande.soustraitantId
              }));
              
              return {
                soustraitantId: commande.soustraitantId,
                nom: commande.soustraitantNom,
                etatsAvancement: etatsAvecType,
                commande: {
                  id: commande.id,
                  reference: commande.reference,
                  dateCommande: commande.dateCommande,
                  total: commande.total,
                  estVerrouillee: commande.estVerrouillee
                }
              };
            }
            return null;
          } catch (error) {
            console.error(`Erreur lors de la récupération des états pour le sous-traitant ${commande.soustraitantId}:`, error);
            return null;
          }
        });
        
        const soustraitantsData = (await Promise.all(etatsPromises)).filter(data => data !== null) as SousTraitant[];
        setSousTraitants(soustraitantsData);
        setDataLoaded(true);
        
      } catch (error) {
        console.error(error);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [session, chantierId, dataLoaded]);

  const handleCreateEtat = async () => {
    if (!chantierId) return;
    
    try {
      setIsCreating(true);
      
      // Appel à l'API pour créer un nouvel état d'avancement client
      const response = await fetch(`/api/chantiers/${chantierId}/etats-avancement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chantierId: chantierId,
          date: new Date()
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de l\'état d\'avancement');
      }
      
      const newEtat = await response.json();
      
      // Rediriger vers le nouvel état
      router.push(`/chantiers/${chantierId}/etats/${newEtat.numero}`);
      
      toast.success('État d\'avancement créé avec succès');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la création de l\'état d\'avancement');
    } finally {
      setIsCreating(false);
    }
  }

  const handleCreateSoustraitantEtat = (sousTraitantId: string) => {
    if (!chantierId) return;
    
    setShowSelectModal(false);
    router.push(`/chantiers/${chantierId}/etats/soustraitants/selection-postes?soustraitantId=${sousTraitantId}`);
  }

  const handleViewEtat = (etat: any) => {
    if (etat.soustraitantId) {
      // Si c'est un état sous-traitant
      router.push(`/chantiers/${chantierId}/soustraitant-etats/${etat.soustraitantId}`);
    } else {
      // Si c'est un état client
      router.push(`/chantiers/${chantierId}/etats/${etat.numero}`);
    }
  }

  const handleEditEtat = (etat: any) => {
    console.log('Éditer état', etat)
  }

  const handleDeleteEtat = async (etat: any) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet état d\'avancement ?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/etats-avancement/${etat.numero}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de l\'état d\'avancement')
      }
      
      // Mettre à jour la liste des états
      const etatsResponse = await fetch(`/api/chantiers/${chantierId}/etats-avancement`);
      const updatedEtats = await etatsResponse.json();
      setEtatsAvancement(updatedEtats);
      
      toast.success('État d\'avancement supprimé avec succès')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la suppression de l\'état d\'avancement')
    }
  }

  function TableEtatsAvancement({ etats }: { etats: EtatAvancementEtendu[] }) {
    const router = useRouter()
    
    const handleRowClick = (etat: EtatAvancementEtendu) => {
      if (!chantierId) return;
      
      if (etat.typeSoustraitant && etat.soustraitantId) {
        router.push(`/chantiers/${chantierId}/soustraitant-etats/${etat.soustraitantId}/${etat.id}`)
      } else {
        router.push(`/chantiers/${chantierId}/etats/${etat.numero}`)
      }
    }
    
    // Fonction pour vérifier si un état peut être supprimé
    const canDeleteEtat = (etat: EtatAvancementEtendu, allEtats: EtatAvancementEtendu[]) => {
      // Ne pas permettre la suppression d'un état finalisé
      if (etat.estFinalise) return false;
      
      if (etat.typeSoustraitant) {
        // Pour un état sous-traitant, vérifier si c'est le dernier état (numéro le plus élevé)
        const isLastEtat = !allEtats.some(e => 
          e.typeSoustraitant && e.soustraitantId === etat.soustraitantId && e.numero > etat.numero
        );
        
        return isLastEtat;
      } else {
        // Pour un état client, vérifier si c'est le dernier état (numéro le plus élevé)
        const isLastEtat = !allEtats.some(e => 
          !e.typeSoustraitant && e.numero > etat.numero
        );
        
        return isLastEtat;
      }
    };
    
    const handleDeleteEtat = async (e: React.MouseEvent, etat: EtatAvancementEtendu) => {
      if (!chantierId) return;
      
      e.stopPropagation();
      
      if (!confirm(`Êtes-vous sûr de vouloir supprimer l'état d'avancement n°${etat.numero} ?`)) {
        return;
      }
      
      try {
        setLoading(true);
        
        let response;
        
        if (etat.typeSoustraitant && etat.soustraitantId) {
          // Suppression d'un état sous-traitant
          response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${etat.soustraitantId}/etats-avancement/${etat.id}`, {
            method: 'DELETE',
          });
        } else {
          // Suppression d'un état client
          response = await fetch(`/api/chantiers/${chantierId}/etats-avancement/${etat.numero}`, {
            method: 'DELETE',
          });
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la suppression de l\'état d\'avancement');
        }
        
        toast.success(`État d'avancement n°${etat.numero} supprimé avec succès`);
        
        // Rafraîchir la liste des états en fonction du type
        if (etat.typeSoustraitant && etat.soustraitantId) {
          // Rafraîchir les états sous-traitants
          const stIndex = sousTraitants.findIndex(st => st.soustraitantId === etat.soustraitantId);
          if (stIndex >= 0) {
            const updatedSousTraitants = [...sousTraitants];
            const etatsResponse = await fetch(`/api/chantiers/${chantierId}/soustraitants/${etat.soustraitantId}/etats-avancement`);
            if (etatsResponse.ok) {
              const etatsData = await etatsResponse.json();
              // Ajouter les propriétés typeSoustraitant et soustraitantId à chaque état
              const etatsAvecType = etatsData.map((et: EtatAvancement) => ({
                ...et,
                typeSoustraitant: true,
                soustraitantId: etat.soustraitantId
              }));
              updatedSousTraitants[stIndex].etatsAvancement = etatsAvecType;
              setSousTraitants(updatedSousTraitants);
            }
          }
        } else {
          // Rafraîchir les états client
          const etatsResponse = await fetch(`/api/chantiers/${chantierId}/etats-avancement`);
          if (etatsResponse.ok) {
            const data = await etatsResponse.json();
            setEtatsAvancement(data);
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la suppression de l\'état d\'avancement');
      } finally {
        setLoading(false);
      }
    };
    
    // Memoization du rendu de la table pour éviter les re-rendus inutiles
    const tableContent = React.useMemo(() => {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">N°</th>
                <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                <th className="w-56 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Montant de l'état</th>
                <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Statut</th>
                <th className="w-32 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {etats.map((etat) => (
                <tr 
                  key={etat.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => handleRowClick(etat)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {etat.numero}
                    {etat.typeSoustraitant && (
                      <span className="ml-2 text-xs text-blue-500">(Sous-traitant)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(etat.date).toLocaleDateString('fr-FR')}
                    {etat.mois && <span className="ml-2 italic">({etat.mois})</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {(etat.lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0) + 
                      etat.avenants.reduce((sum, avenant) => sum + avenant.montantActuel, 0)
                    ).toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      etat.estFinalise 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {etat.estFinalise ? 'Finalisé' : 'En cours'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (etat.typeSoustraitant && etat.soustraitantId) {
                          router.push(`/chantiers/${chantierId}/soustraitant-etats/${etat.soustraitantId}/${etat.id}`);
                        } else {
                          router.push(`/chantiers/${chantierId}/etats/${etat.numero}`);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <EyeIcon className="h-5 w-5 inline" />
                    </button>
                    
                    {canDeleteEtat(etat, etats) && (
                      <button
                        onClick={(e) => handleDeleteEtat(e, etat)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
                        title="Supprimer cet état d'avancement"
                      >
                        <TrashIcon className="h-5 w-5 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }, [etats, chantierId]);
    
    return tableContent;
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      {error}
    </div>
  )

  if (!chantier) return (
    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
      Chantier non trouvé
    </div>
  )

  return (
    <div className="container mx-auto py-6">
      <DocumentExpirationAlert />
      <Toaster position="top-right" />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/chantiers`)}
                className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md transition-all hover:shadow-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                  États d'avancement
                </h1>
                <div className="flex items-center mt-2">
                  {chantier && (
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {chantier.nomChantier}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="p-6">
          <CollapsibleSection 
            title="État d'avancement Client" 
            icon="📊"
            defaultOpen={true}
          >
            <div className="space-y-4">
              {etatsAvancement.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Aucun état d'avancement client n'a encore été créé.
                  </p>
                  <button
                    onClick={handleCreateEtat}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center mx-auto justify-center shadow-md transition-all hover:shadow-lg border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Créer le premier état d'avancement
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleCreateEtat}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center shadow-md transition-all hover:shadow-lg border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Nouvel état d'avancement
                    </button>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <TableEtatsAvancement etats={etatsAvancement as EtatAvancementEtendu[]} />
                  </div>
                </>
              )}
            </div>
          </CollapsibleSection>

          {/* Sections pour chaque sous-traitant avec une commande validée */}
          {sousTraitants.map((st) => (
            <CollapsibleSection
              key={st.soustraitantId}
              title={`Sous-traitant: ${st.nom}`}
              icon="🏗️"
              defaultOpen={true}
            >
              <div className="space-y-4">
                {/* En-tête avec les boutons d'action */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Commande {st.commande.reference || `#${st.commande.id}`} - 
                      {new Date(st.commande.dateCommande).toLocaleDateString('fr-FR')} - 
                      {st.commande.total.toLocaleString('fr-FR')} €
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/chantiers/${chantierId}/etats/soustraitants/${st.soustraitantId}/commande/${st.commande.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center shadow-sm transition-all hover:shadow-md border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
                    >
                      <EyeIcon className="h-5 w-5 mr-2" />
                      Voir commande
                    </Link>
                    <button
                      onClick={() => window.open(`/api/chantiers/${chantierId}/soustraitants/${st.soustraitantId}/commandes/${st.commande.id}/pdf`, '_blank')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center shadow-sm transition-all hover:shadow-md border border-green-700 hover:border-green-500 dark:border-green-600 dark:hover:border-green-500"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                      Télécharger PDF
                    </button>
                  </div>
                </div>

                {/* Liste des états d'avancement du sous-traitant */}
                <div className="mt-4">
                  {st.etatsAvancement.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Aucun état d'avancement n'a encore été créé pour ce sous-traitant.
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            setLoading(true)
                            const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${st.soustraitantId}/etats-avancement`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                chantierId: chantierId,
                                soustraitantId: st.soustraitantId,
                                commandeId: st.commande.id
                              }),
                            })

                            if (!response.ok) {
                              const errorData = await response.json()
                              
                              // Vérifier si l'erreur est due à un état précédent non finalisé
                              if (response.status === 400 && errorData.error && errorData.error.includes('état d\'avancement précédent doit être finalisé')) {
                                toast.error('L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état.')
                                setLoading(false)
                                return
                              }
                              
                              throw new Error(errorData.error || 'Erreur lors de la création de l\'état d\'avancement')
                            }

                            const newEtat = await response.json()
                            router.push(`/chantiers/${chantierId}/soustraitant-etats/${st.soustraitantId}`)
                          } catch (error) {
                            console.error('Erreur:', error)
                            toast.error('Erreur lors de la création de l\'état d\'avancement')
                          } finally {
                            setLoading(false)
                          }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center mx-auto justify-center shadow-md transition-all hover:shadow-lg border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
                      >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Créer le premier état d'avancement
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={async () => {
                            try {
                              setLoading(true)
                              const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${st.soustraitantId}/etats-avancement`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  chantierId: chantierId,
                                  soustraitantId: st.soustraitantId,
                                  commandeId: st.commande.id
                                }),
                              })

                              if (!response.ok) {
                                const errorData = await response.json()
                                
                                // Vérifier si l'erreur est due à un état précédent non finalisé
                                if (response.status === 400 && errorData.error && errorData.error.includes('état d\'avancement précédent doit être finalisé')) {
                                  toast.error('L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état.')
                                  setLoading(false)
                                  return
                                }
                                
                                throw new Error(errorData.error || 'Erreur lors de la création de l\'état d\'avancement')
                              }

                              const newEtat = await response.json()
                              router.push(`/chantiers/${chantierId}/soustraitant-etats/${st.soustraitantId}`)
                            } catch (error) {
                              console.error('Erreur:', error)
                              toast.error('Erreur lors de la création de l\'état d\'avancement')
                            } finally {
                              setLoading(false)
                            }
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center shadow-md transition-all hover:shadow-lg border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
                        >
                          <PlusIcon className="h-5 w-5 mr-2" />
                          Nouvel état d'avancement
                        </button>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <TableEtatsAvancement etats={st.etatsAvancement} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          ))}

          <div className="mt-6 mb-6">
            <button
              onClick={() => setShowSelectModal(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 flex items-center shadow-md transition-all hover:shadow-lg border border-gray-700 hover:border-gray-500 dark:border-gray-600 dark:hover:border-gray-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter un nouveau sous-traitant
            </button>
          </div>

          <CollapsibleSection
            title="Dépenses"
            icon="💰"
            defaultOpen={true}
          >
            <DepenseSection chantierId={chantierId || ""} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Résumé Financier"
            icon="📊"
            defaultOpen={true}
          >
            <div className="mt-4">
              <CardFinancialSummary 
                chantierId={chantierId || ""}
                etatId="global"
              />
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <SousTraitantSelectModal
        isOpen={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        onSubmit={handleCreateSoustraitantEtat}
        chantierId={chantierId || ""}
      />
    </div>
  )
} 