'use client'
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { type Chantier } from '@/types/chantier'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { 
  PencilSquareIcon, 
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  PlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { EtatAvancement } from '@/types/etat-avancement'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EtatAvancementClient from '@/components/etat-avancement/EtatAvancementClient'

interface PageProps {
  params: Promise<{
    chantierId: string
    etatId: string
  }>
}

export default function EtatAvancementPage(props: PageProps) {
  const params = use(props.params);
  const { data: session } = useSession()
  const router = useRouter()
  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [etatAvancement, setEtatAvancement] = useState<EtatAvancement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [hasNextEtat, setHasNextEtat] = useState(false)
  const [mois, setMois] = useState<string>('')

  // Fonction pour gérer la navigation
  const handleNavigation = (path: string) => {
    window.location.href = path
  }

  useEffect(() => {
    const fetchChantier = async () => {
      try {
        const response = await fetch(`/api/chantiers/${params.chantierId}`)
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération du chantier')
        }
        const data = await response.json()
        setChantier(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
        window.location.href = '/chantiers'
      }
    }

    const fetchEtatAvancement = async () => {
      try {
        const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}`)
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de l\'état d\'avancement')
        }
        const data = await response.json()
        setEtatAvancement(data)
        setMois(data.mois || '')
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement de l\'état d\'avancement')
        window.location.href = `/chantiers/${params.chantierId}/etats`
      } finally {
        setLoading(false)
      }
    }

    const checkNextEtat = async () => {
      if (!params.etatId) return;
      
      try {
        // Vérifier s'il existe un état d'avancement avec un numéro supérieur
        const nextEtatNumber = parseInt(params.etatId) + 1;
        const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${nextEtatNumber}`);
        
        // Si la réponse est OK, cela signifie qu'un état suivant existe
        setHasNextEtat(response.ok);
        
        // Si l'état n'existe pas (404), on ne génère pas d'erreur dans la console
        if (response.status === 404) {
          console.debug(`État d'avancement ${nextEtatNumber} non trouvé - comportement normal`);
        } else if (!response.ok) {
          // Pour les autres types d'erreurs, on les log comme avant
          console.error(`Erreur lors de la vérification de l'état ${nextEtatNumber}:`, response.statusText);
        }
      } catch (error) {
        // On ne log pas les erreurs réseau ici pour éviter de polluer la console
        // Elles sont généralement liées à l'absence de l'état suivant
        setHasNextEtat(false);
      }
    };

    if (session) {
      fetchChantier()
      fetchEtatAvancement()
      checkNextEtat()
    }
  }, [session, params.chantierId, params.etatId])

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}/pdf`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `etat-avancement-${params.chantierId}-${etatAvancement?.numero || ''}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la génération du PDF')
    }
  }

  const handleValidateEtat = async () => {
    if (!etatAvancement) return;
    
    try {
      setValidating(true);
      
      console.log('Validation de l\'état avec commentaires:', etatAvancement.commentaires);
      
      // S'assurer que les commentaires sont bien à jour avant la validation
      // Récupérer les derniers commentaires de l'état d'avancement
      const getResponse = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}`);
      if (!getResponse.ok) {
        throw new Error('Erreur lors de la récupération de l\'état d\'avancement');
      }
      const currentEtat = await getResponse.json();
      console.log('Commentaires actuels avant validation:', currentEtat.commentaires);
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentaires: currentEtat.commentaires || etatAvancement.commentaires || '',
          mois: mois,
          estFinalise: true
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la validation de l\'état d\'avancement');
      }

      const updatedEtat = await response.json();
      console.log('État validé avec commentaires:', updatedEtat.commentaires);
      setEtatAvancement(updatedEtat);
      
      // Afficher un message de succès
      alert('État d\'avancement validé avec succès !');
      
      // Rediriger vers la liste des états d'avancement
      router.push(`/chantiers/${params.chantierId}/etats`);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors de la validation de l\'état d\'avancement');
    } finally {
      setValidating(false);
    }
  };

  const handleReopenEtat = async () => {
    if (!etatAvancement) return;
    
    try {
      setValidating(true);
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentaires: etatAvancement.commentaires,
          mois: mois,
          estFinalise: false
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la réouverture de l\'état d\'avancement');
      }

      const updatedEtat = await response.json();
      setEtatAvancement(updatedEtat);
      
      // Afficher un message de succès
      alert('État d\'avancement réouvert avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors de la réouverture de l\'état d\'avancement');
    } finally {
      setValidating(false);
    }
  };

  // Ajouter cette fonction pour sauvegarder le mois automatiquement quand il change
  const handleMoisChange = async (newMois: string) => {
    setMois(newMois);
    
    if (!etatAvancement) return;
    
    try {
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentaires: etatAvancement.commentaires,
          mois: newMois,
          estFinalise: etatAvancement.estFinalise
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde de la période de travaux');
      }

      const updatedEtat = await response.json();
      setEtatAvancement(updatedEtat);
      
      // Optionnel: feedback visuel subtil
      // toast.success('Période de travaux sauvegardée');
    } catch (error) {
      console.error('Erreur:', error);
      // Optionnel: afficher un message d'erreur
      // toast.error('Erreur lors de la sauvegarde de la période de travaux');
    }
  };

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!chantier || !etatAvancement) return <div className="p-8">État d'avancement non trouvé</div>

  return (
    <div className="container mx-auto py-6">
      <DocumentExpirationAlert />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <button
                onClick={() => handleNavigation(`/chantiers/${params.chantierId}/etats`)}
                className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md transition-all hover:shadow-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                    État d'avancement n°{etatAvancement.numero}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <select 
                      value={mois} 
                      onChange={(e) => handleMoisChange(e.target.value)}
                      className={`bg-transparent border-0 focus:ring-0 p-0 ${!etatAvancement?.estFinalise ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      disabled={etatAvancement?.estFinalise}
                    >
                      <option value="">Période de travaux</option>
                      <option value="Janvier">Janvier</option>
                      <option value="Février">Février</option>
                      <option value="Mars">Mars</option>
                      <option value="Avril">Avril</option>
                      <option value="Mai">Mai</option>
                      <option value="Juin">Juin</option>
                      <option value="Juillet">Juillet</option>
                      <option value="Août">Août</option>
                      <option value="Septembre">Septembre</option>
                      <option value="Octobre">Octobre</option>
                      <option value="Novembre">Novembre</option>
                      <option value="Décembre">Décembre</option>
                    </select>
                  </span>
                  <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {chantier.nomChantier}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 self-end md:self-auto">
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
            <EtatAvancementClient 
              etatAvancement={etatAvancement} 
              chantierId={params.chantierId}
              etatId={params.etatId}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 