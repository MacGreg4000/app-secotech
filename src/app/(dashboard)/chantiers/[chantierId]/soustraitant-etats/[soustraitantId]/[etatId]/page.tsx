'use client'
import { useState, useEffect } from 'react'
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
import SoustraitantEtatComponent from '@/components/etat-avancement/SoustraitantEtat'

interface PageProps {
  params: {
    chantierId: string
    soustraitantId: string
    etatId: string
  }
}

export default function SoustraitantEtatDetailPage({ params }: PageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [soustraitant, setSoustraitant] = useState<any | null>(null)
  const [etatAvancement, setEtatAvancement] = useState<SoustraitantEtat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [hasNextEtat, setHasNextEtat] = useState(false)
  const [hasPrevEtat, setHasPrevEtat] = useState(false)
  const [allEtats, setAllEtats] = useState<SoustraitantEtat[]>([])
  const [currentEtatId, setCurrentEtatId] = useState<string | null>(null)

  // Fonction pour gérer la navigation
  const handleNavigation = (path: string) => {
    window.location.href = path
  }

  useEffect(() => {
    const fetchSoustraitant = async () => {
      try {
        const response = await fetch(`/api/soustraitants/${params.soustraitantId}`)
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
        const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement`)
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des états d\'avancement')
        }
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          setAllEtats(data)
          checkAdjacentEtats(params.etatId)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des états d\'avancement')
      }
    }

    const loadEtatAvancement = async (etatId: string) => {
      try {
        setLoading(true)
        
        const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etatId}`)
        
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
        setCurrentEtatId(etatId)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors de la récupération de l\'état d\'avancement')
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchSoustraitant()
      fetchAllEtats()
      loadEtatAvancement(params.etatId)
    }
  }, [session, params.chantierId, params.soustraitantId, params.etatId])

  const checkAdjacentEtats = (etatId: string) => {
    if (allEtats.length === 0) return
    
    const currentIndex = allEtats.findIndex(etat => etat.id.toString() === etatId)
    if (currentIndex === -1) return
    
    setHasPrevEtat(currentIndex > 0)
    setHasNextEtat(currentIndex < allEtats.length - 1)
  }

  const navigateToPrevEtat = () => {
    if (!hasPrevEtat || allEtats.length === 0) return
    
    const currentIndex = allEtats.findIndex(etat => etat.id.toString() === params.etatId)
    if (currentIndex > 0) {
      const prevEtat = allEtats[currentIndex - 1]
      router.push(`/chantiers/${params.chantierId}/soustraitant-etats/${params.soustraitantId}/${prevEtat.id}`)
    }
  }

  const navigateToNextEtat = () => {
    if (!hasNextEtat || allEtats.length === 0) return
    
    const currentIndex = allEtats.findIndex(etat => etat.id.toString() === params.etatId)
    if (currentIndex < allEtats.length - 1) {
      const nextEtat = allEtats[currentIndex + 1]
      router.push(`/chantiers/${params.chantierId}/soustraitant-etats/${params.soustraitantId}/${nextEtat.id}`)
    }
  }

  const handleDownloadPDF = async () => {
    if (!etatAvancement) return
    
    try {
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etatAvancement.id}/pdf`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }

      const data = await response.json()
      
      if (!data || !data.documentUrl) {
        throw new Error('Erreur: Chemin du document non trouvé dans la réponse')
      }
      
      // Utiliser la route de téléchargement de documents
      window.location.href = `/api/documents/download?path=${data.documentUrl}`
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la génération du PDF')
    }
  }

  const handleValidateEtat = async () => {
    if (!etatAvancement) return
    
    try {
      setValidating(true)
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etatAvancement.id}/finaliser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la validation de l\'état d\'avancement')
      }

      const updatedEtat = await response.json()
      setEtatAvancement(updatedEtat)
      
      // Afficher un message de succès
      alert('État d\'avancement validé avec succès !')
      
      // Rediriger vers la liste des états d'avancement
      router.push(`/chantiers/${params.chantierId}/etats`)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la validation de l\'état d\'avancement')
    } finally {
      setValidating(false)
    }
  }

  const handleReopenEtat = async () => {
    if (!etatAvancement) return
    
    try {
      setValidating(true)
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etatAvancement.id}/rouvrir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la réouverture de l\'état d\'avancement')
      }

      const updatedEtat = await response.json()
      setEtatAvancement(updatedEtat)
      
      // Afficher un message de succès
      alert('État d\'avancement réouvert avec succès !')
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la réouverture de l\'état d\'avancement')
    } finally {
      setValidating(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!etatAvancement) return <div className="p-8">État d'avancement non trouvé</div>

  return (
    <div>
      <DocumentExpirationAlert />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation(`/chantiers/${params.chantierId}/soustraitant-etats/${params.soustraitantId}`)}
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
            
            <div className="flex space-x-3 self-end md:self-auto">
              <div className="flex space-x-2 mr-2">
                <button
                  onClick={navigateToPrevEtat}
                  disabled={!hasPrevEtat}
                  className={`px-3 py-1 rounded-lg border ${
                    hasPrevEtat 
                      ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600' 
                      : 'text-gray-400 bg-gray-100 border-gray-200 dark:text-gray-500 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed'
                  }`}
                >
                  ← Précédent
                </button>
                <button
                  onClick={navigateToNextEtat}
                  disabled={!hasNextEtat}
                  className={`px-3 py-1 rounded-lg border ${
                    hasNextEtat 
                      ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600' 
                      : 'text-gray-400 bg-gray-100 border-gray-200 dark:text-gray-500 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed'
                  }`}
                >
                  Suivant →
                </button>
              </div>

              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 flex items-center justify-center shadow-md transition-all hover:shadow-lg border border-green-700 hover:border-green-500 dark:border-green-600 dark:hover:border-green-500"
                title="Télécharger PDF"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Télécharger PDF
              </button>
              
              {!etatAvancement.estFinalise ? (
                <button
                  onClick={handleValidateEtat}
                  disabled={validating}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:shadow-lg border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {validating ? 'Validation...' : 'Valider l\'état'}
                </button>
              ) : !hasNextEtat && (
                <button
                  onClick={handleReopenEtat}
                  disabled={validating}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:shadow-lg border border-amber-700 hover:border-amber-500 dark:border-amber-600 dark:hover:border-amber-500"
                >
                  <PencilSquareIcon className="h-5 w-5 mr-2" />
                  {validating ? 'Réouverture...' : 'Réouvrir l\'état'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <SoustraitantEtatComponent 
              soustraitantEtat={etatAvancement} 
              chantierId={params.chantierId}
            />
          </div>
          <div className="mt-8 mb-4">
            <h2 className="text-xl font-semibold mb-4">Liste des états d'avancement</h2>
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">N°</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Montant de l'état</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                  {allEtats.map((etat) => (
                    <tr 
                      key={etat.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer relative ${etat.id.toString() === params.etatId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => {
                        router.push(`/chantiers/${params.chantierId}/soustraitant-etats/${params.soustraitantId}/${etat.id}`);
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/chantiers/${params.chantierId}/soustraitant-etats/${params.soustraitantId}/${etat.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Voir"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          {!etat.estFinalise && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Êtes-vous sûr de vouloir supprimer cet état d\'avancement ?')) {
                                  try {
                                    const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etat.id}`, {
                                      method: 'DELETE',
                                    });
                                    if (!response.ok) throw new Error('Erreur lors de la suppression');
                                    
                                    // Rediriger vers la page précédente si on supprime l'état actuel
                                    if (etat.id.toString() === params.etatId) {
                                      router.push(`/chantiers/${params.chantierId}/soustraitant-etats/${params.soustraitantId}`);
                                    } else {
                                      // Rafraîchir la page pour mettre à jour les données
                                      window.location.reload();
                                    }
                                    
                                    alert('État d\'avancement supprimé avec succès');
                                  } catch (error) {
                                    console.error('Erreur:', error);
                                    alert('Erreur lors de la suppression de l\'état d\'avancement');
                                  }
                                }
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Supprimer"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              
                              // Télécharger le PDF de cet état
                              fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etat.id}/pdf`, {
                                method: 'GET',
                              })
                              .then(response => {
                                if (!response.ok) throw new Error('Erreur lors de la génération du PDF');
                                return response.json();
                              })
                              .then(data => {
                                if (!data || !data.documentUrl) {
                                  throw new Error('Erreur: Chemin du document non trouvé dans la réponse');
                                }
                                
                                // Rediriger vers la route de téléchargement
                                window.location.href = `/api/documents/download?path=${data.documentUrl}`;
                              })
                              .catch(error => {
                                console.error('Erreur:', error);
                                alert('Erreur lors de la génération du PDF');
                              });
                            }}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Télécharger PDF"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 