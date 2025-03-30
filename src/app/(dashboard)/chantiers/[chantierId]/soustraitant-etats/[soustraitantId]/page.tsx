'use client'
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { 
  PencilSquareIcon, 
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  PlusIcon,
  CheckCircleIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { SoustraitantEtat } from '@/types/etat-avancement'
import Link from 'next/link'
import { toast, Toaster } from 'react-hot-toast'
import SoustraitantEtatComponent from '@/components/etat-avancement/SoustraitantEtat'
import EditableSoustraitantEtat from '@/components/etat-avancement/EditableSoustraitantEtat'
import EtatAvancementSSTraitant from '@/components/etat-avancement/EtatAvancementSSTraitant'

interface PageProps {
  params: Promise<{
    chantierId: string
    soustraitantId: string
  }>
}

export default function SoustraitantEtatsPage(props: PageProps) {
  const params = use(props.params);
  const { data: session } = useSession()
  const router = useRouter()
  const [soustraitant, setSoustraitant] = useState<any | null>(null)
  const [etatAvancement, setEtatAvancement] = useState<SoustraitantEtat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [hasNextEtat, setHasNextEtat] = useState(false)
  const [hasPrevEtat, setHasPrevEtat] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [allEtats, setAllEtats] = useState<SoustraitantEtat[]>([])
  const [currentEtatId, setCurrentEtatId] = useState<number | null>(null)
  const [routeParams, setRouteParams] = useState<{
    chantierId?: string;
    soustraitantId?: string;
  }>({});

  // Attendre les paramètres de route
  useEffect(() => {
    const initParams = async () => {
      const awaitedParams = await params;
      setRouteParams({
        chantierId: awaitedParams.chantierId,
        soustraitantId: awaitedParams.soustraitantId
      });
    };
    
    initParams();
  }, [params]);

  // Fonction pour gérer la navigation
  const handleNavigation = (path: string) => {
    window.location.href = path
  }

  useEffect(() => {
    if (!routeParams.chantierId || !routeParams.soustraitantId) return;
    
    const fetchSoustraitant = async () => {
      try {
        const response = await fetch(`/api/soustraitants/${routeParams.soustraitantId}`)
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération du sous-traitant')
        }
        const data = await response.json()
        setSoustraitant(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du sous-traitant')
      }
    }

    const fetchAllEtats = async () => {
      try {
        const response = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement`)
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des états d\'avancement')
        }
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          setAllEtats(data)
          // Si aucun état n'est actuellement sélectionné, sélectionner le dernier
          if (!currentEtatId) {
            const lastEtat = data[data.length - 1]
            setCurrentEtatId(lastEtat.id)
            fetchEtatAvancement(lastEtat.id)
          }
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des états d\'avancement')
        setLoading(false)
      }
    }

    if (session) {
      fetchSoustraitant()
      fetchAllEtats()
    }
  }, [session, routeParams, currentEtatId])

  const fetchEtatAvancement = async (etatId: number) => {
    if (!routeParams.chantierId || !routeParams.soustraitantId) return;
    
    try {
      const response = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement/${etatId}`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'état d\'avancement')
      }
      const data = await response.json()
      
      // Vérifier que les lignes et avenants sont présents
      if (!data.lignes) {
        console.error('La réponse ne contient pas de lignes:', data);
        data.lignes = [];
      }
      
      if (!data.avenants) {
        console.error('La réponse ne contient pas d\'avenants:', data);
        data.avenants = [];
      }
      
      setEtatAvancement(data)
      setCurrentEtatId(data.id)
      setLoading(false)
      checkAdjacentEtats(etatId)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors du chargement de l\'état d\'avancement')
      setLoading(false)
    }
  }

  const checkAdjacentEtats = (etatId: number) => {
    if (allEtats.length === 0) return
    
    const currentIndex = allEtats.findIndex(etat => etat.id === etatId)
    if (currentIndex === -1) return
    
    setHasPrevEtat(currentIndex > 0)
    setHasNextEtat(currentIndex < allEtats.length - 1)
  }

  const navigateToPrevEtat = () => {
    if (!hasPrevEtat || !currentEtatId || allEtats.length === 0) return
    
    const currentIndex = allEtats.findIndex(etat => etat.id === currentEtatId)
    if (currentIndex > 0) {
      const prevEtat = allEtats[currentIndex - 1]
      setCurrentEtatId(prevEtat.id)
    }
  }

  const navigateToNextEtat = () => {
    if (!hasNextEtat || !currentEtatId || allEtats.length === 0) return
    
    const currentIndex = allEtats.findIndex(etat => etat.id === currentEtatId)
    if (currentIndex < allEtats.length - 1) {
      const nextEtat = allEtats[currentIndex + 1]
      setCurrentEtatId(nextEtat.id)
    }
  }

  const handleDownloadPDF = async () => {
    if (!etatAvancement || !routeParams.chantierId || !routeParams.soustraitantId) return
    
    try {
      const response = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement/${etatAvancement.id}/pdf`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `etat-avancement-soustraitant-${routeParams.chantierId}-${routeParams.soustraitantId}-${etatAvancement.numero}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleValidateEtat = async () => {
    if (!etatAvancement || !routeParams.chantierId || !routeParams.soustraitantId) return;
    
    try {
      setValidating(true);
      
      const response = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement/${etatAvancement.id}/finaliser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la validation de l\'état d\'avancement');
      }

      const updatedEtat = await response.json();
      
      // Vérifier que les lignes et avenants sont présents
      if (!updatedEtat.lignes) {
        console.error('La réponse ne contient pas de lignes:', updatedEtat);
        updatedEtat.lignes = etatAvancement.lignes || [];
      }
      
      if (!updatedEtat.avenants) {
        console.error('La réponse ne contient pas d\'avenants:', updatedEtat);
        updatedEtat.avenants = etatAvancement.avenants || [];
      }
      
      setEtatAvancement(updatedEtat);
      
      // Mettre à jour l'état dans la liste complète
      setAllEtats(prev => prev.map(etat => 
        etat.id === updatedEtat.id ? updatedEtat : etat
      ));
      
      // Afficher un message de succès
      toast.success('État d\'avancement validé avec succès !');
      
      // Rediriger vers la liste des états d'avancement
      router.push(`/chantiers/${routeParams.chantierId}/etats`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la validation de l\'état d\'avancement');
    } finally {
      setValidating(false);
    }
  };

  const handleReopenEtat = async () => {
    if (!etatAvancement || !routeParams.chantierId || !routeParams.soustraitantId) return;
    
    try {
      setValidating(true);
      
      const response = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement/${etatAvancement.id}/rouvrir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la réouverture de l\'état d\'avancement');
      }

      const updatedEtat = await response.json();
      
      // Vérifier que les lignes et avenants sont présents
      if (!updatedEtat.lignes) {
        console.error('La réponse ne contient pas de lignes:', updatedEtat);
        updatedEtat.lignes = etatAvancement.lignes || [];
      }
      
      if (!updatedEtat.avenants) {
        console.error('La réponse ne contient pas d\'avenants:', updatedEtat);
        updatedEtat.avenants = etatAvancement.avenants || [];
      }
      
      setEtatAvancement(updatedEtat);
      
      // Mettre à jour l'état dans la liste complète
      setAllEtats(prev => prev.map(etat => 
        etat.id === updatedEtat.id ? updatedEtat : etat
      ));
      
      // Afficher un message de succès
      toast.success('État d\'avancement réouvert avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la réouverture de l\'état d\'avancement');
    } finally {
      setValidating(false);
    }
  };

  const handleCreateEtat = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chantierId: routeParams.chantierId,
          soustraitantId: routeParams.soustraitantId
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
      
      // Rafraîchir la liste des états
      const updatedEtatsResponse = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement`)
      if (updatedEtatsResponse.ok) {
        const updatedEtats = await updatedEtatsResponse.json()
        setAllEtats(updatedEtats)
      }
      
      // Sélectionner le nouvel état
      setCurrentEtatId(newEtat.id)
      setEtatAvancement(newEtat)
      toast.success('Nouvel état d\'avancement créé avec succès !')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création de l\'état d\'avancement')
    } finally {
      setLoading(false)
    }
  };

  const handleDeleteEtat = async () => {
    if (!etatAvancement || !currentEtatId) return
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet état d\'avancement ?')) {
      return
    }
    
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement/${etatAvancement.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de l\'état d\'avancement')
      }

      toast.success('État d\'avancement supprimé avec succès !')
      
      // Rafraîchir la liste des états
      const updatedEtatsResponse = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement`)
      if (updatedEtatsResponse.ok) {
        const updatedEtats = await updatedEtatsResponse.json()
        setAllEtats(updatedEtats)
        
        // Sélectionner le dernier état s'il y en a un, sinon mettre à null
        if (updatedEtats.length > 0) {
          const lastEtat = updatedEtats[updatedEtats.length - 1]
          setCurrentEtatId(lastEtat.id)
          setEtatAvancement(lastEtat)
        } else {
          setCurrentEtatId(null)
          setEtatAvancement(null)
        }
      } else {
        setCurrentEtatId(null)
        setEtatAvancement(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de l\'état d\'avancement')
    } finally {
      setLoading(false)
    }
  };

  // Fonction pour charger un état d'avancement spécifique
  const loadEtatAvancement = async (etatId: number) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/chantiers/${routeParams.chantierId}/soustraitants/${routeParams.soustraitantId}/etats-avancement/${etatId}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'état d\'avancement')
      }

      const data = await response.json()
      
      // Vérifier que les relations sont bien présentes
      if (!data.lignes) {
        console.error('Les lignes ne sont pas incluses dans la réponse:', data)
        data.lignes = []
      }
      
      if (!data.avenants) {
        console.error('Les avenants ne sont pas inclus dans la réponse:', data)
        data.avenants = []
      }
      
      setEtatAvancement(data)
      setCurrentEtatId(data.id)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la récupération de l\'état d\'avancement')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!etatAvancement) return <div className="p-8">Aucun état d'avancement trouvé pour ce sous-traitant</div>

  return (
    <div>
      <DocumentExpirationAlert />
      <Toaster position="top-right" />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation(`/chantiers/${routeParams.chantierId}/etats`)}
                className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md transition-all hover:shadow-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                    État d'avancement {soustraitant?.nom || 'sous-traitant'} n°{etatAvancement.numero}
                  </h1>
                  {etatAvancement.estFinalise && (
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 border border-green-200 dark:border-green-700 shadow-sm">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Validé
                    </span>
                  )}
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(etatAvancement.date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {soustraitant?.nom || 'Sous-traitant'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {hasNextEtat && (
                <button
                  onClick={navigateToNextEtat}
                  className="bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm flex items-center transition"
                >
                  État suivant
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              {hasPrevEtat && (
                <button
                  onClick={navigateToPrevEtat}
                  className="bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm flex items-center transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  État précédent
                </button>
              )}
              
              <button
                onClick={handleDownloadPDF}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md shadow-sm flex items-center transition dark:bg-amber-700 dark:hover:bg-amber-800"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Télécharger PDF
              </button>
              
              {etatAvancement.estFinalise ? (
                <button
                  onClick={handleReopenEtat}
                  disabled={validating}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md shadow-sm flex items-center transition dark:bg-orange-700 dark:hover:bg-orange-800"
                >
                  <PencilSquareIcon className="h-5 w-5 mr-2" />
                  Rouvrir l'état
                </button>
              ) : (
                <button
                  onClick={handleValidateEtat}
                  disabled={validating}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm flex items-center transition dark:bg-green-700 dark:hover:bg-green-800"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Valider l'état
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Corps de la page */}
        <div className="p-6 overflow-auto">
          <EtatAvancementSSTraitant 
            etatAvancement={etatAvancement}
            chantierId={routeParams.chantierId || ""}
            etatId={currentEtatId ? currentEtatId.toString() : ''}
          />
        </div>

        {/* Après les boutons de l'interface utilisateur, avant le contenu principal */}
        <div className="mt-8 mb-4">
          <style jsx global>{`
            /* Style personnalisé pour les tableaux */
            table {
              border-collapse: separate;
              border-spacing: 0;
              width: 100%;
              border: 1px solid #e5e7eb;
              border-radius: 0.5rem;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              margin-bottom: 0.5rem;
            }
            
            thead th {
              background-color: #f3f4f6;
              color: #111827;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 0.75rem 1rem;
              border-bottom: 2px solid #cbd5e1;
              border-right: 1px solid #e2e8f0;
              position: relative;
            }
            
            thead th:last-child {
              border-right: none;
            }
            
            tbody tr {
              border-bottom: 1px solid #e5e7eb;
            }
            
            tbody tr:last-child {
              border-bottom: none;
            }
            
            tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }
            
            tbody tr:hover {
              background-color: #eef2ff;
            }
            
            td {
              padding: 0.75rem 1rem;
              border-bottom: 1px solid #e5e7eb;
              border-right: 1px solid #f1f5f9;
            }
            
            td:last-child {
              border-right: none;
            }
            
            /* Mode sombre */
            .dark thead th {
              background-color: #1f2937;
              color: #f9fafb;
              border-bottom: 2px solid #475569;
              border-right: 1px solid #334155;
            }
            
            .dark thead th:last-child {
              border-right: none;
            }
            
            .dark table {
              border: 1px solid #374151;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .dark tbody tr {
              border-bottom: 1px solid #334155;
            }
            
            .dark tbody tr:last-child {
              border-bottom: none;
            }
            
            .dark tbody tr:nth-child(even) {
              background-color: #111827;
            }
            
            .dark tbody tr:hover {
              background-color: #1e293b;
            }
            
            .dark td {
              border-bottom: 1px solid #334155;
              border-right: 1px solid #1e293b;
            }
            
            .dark td:last-child {
              border-right: none;
            }
            
            /* Style pour les entrées de formulaire */
            input[type="text"], 
            input[type="number"], 
            select, 
            textarea {
              border-radius: 0.375rem;
              transition: all 0.2s;
            }
            
            input[type="text"]:focus, 
            input[type="number"]:focus, 
            select:focus, 
            textarea:focus {
              outline: none;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
            }
            
            .dark input[type="text"]:focus, 
            .dark input[type="number"]:focus, 
            .dark select:focus, 
            .dark textarea:focus {
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
            }
          `}</style>
          <h2 className="text-xl font-semibold mb-4">Liste des états d'avancement</h2>
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
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
                {allEtats.map((etat) => (
                  <tr 
                    key={etat.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${etat.id === currentEtatId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => {
                      setCurrentEtatId(etat.id);
                      fetchEtatAvancement(etat.id);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {etat.numero}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(etat.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {(etat.lignes?.reduce((sum, ligne) => sum + ligne.montantActuel, 0) + 
                        etat.avenants?.reduce((sum, avenant) => sum + avenant.montantActuel, 0) || 0
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
                          setCurrentEtatId(etat.id);
                          fetchEtatAvancement(etat.id);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <EyeIcon className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 