'use client'
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  DocumentCheckIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  DocumentArrowDownIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { Toaster, toast } from 'react-hot-toast'
import Link from 'next/link'

interface LigneCommande {
  id: number;
  ordre: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
}

interface CommandeSousTraitant {
  id: number;
  reference: string;
  dateCommande: string;
  sousTotal: number;
  tauxTVA: number;
  tva: number;
  total: number;
  statut: string;
  estVerrouillee: boolean;
  soustraitantNom: string;
  soustraitantEmail: string;
  lignes: LigneCommande[];
}

export default function CommandeSousTraitantPage(
  props: {
    params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }>
  }
) {
  const params = use(props.params);
  const { data: session } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commande, setCommande] = useState<CommandeSousTraitant | null>(null)
  const [ligneEnEdition, setLigneEnEdition] = useState<number | null>(null)
  const [lignesTemp, setLignesTemp] = useState<{[key: number]: LigneCommande}>({})

  const fetchCommande = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Commande sous-traitant non trouvée')
        } else {
          throw new Error('Erreur lors de la récupération de la commande sous-traitant')
        }
        return
      }
      
      const data = await response.json()
      setCommande(data)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchCommande()
    }
  }, [session, params.chantierId, params.soustraitantId, params.commandeId])

  const handleEditLigne = (id: number) => {
    if (commande && commande.estVerrouillee) {
      toast.error('La commande est verrouillée et ne peut pas être modifiée')
      return
    }
    
    const ligne = commande?.lignes.find(l => l.id === id)
    if (ligne) {
      setLignesTemp(prev => ({ ...prev, [id]: { ...ligne } }))
      setLigneEnEdition(id)
    }
  }

  const handleCancelEdit = () => {
    setLigneEnEdition(null)
  }

  const handleSaveLigne = async (id: number) => {
    if (!commande) return
    
    const ligne = lignesTemp[id]
    if (!ligne) return
    
    try {
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/lignes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: ligne.description,
          prixUnitaire: ligne.prixUnitaire,
          quantite: ligne.quantite,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la ligne')
      }
      
      // Mettre à jour l'UI
      setCommande({
        ...commande,
        lignes: commande.lignes.map(l => l.id === id ? {
          ...l,
          description: ligne.description,
          prixUnitaire: ligne.prixUnitaire,
          quantite: ligne.quantite,
          total: ligne.prixUnitaire * ligne.quantite
        } : l)
      })
      
      // Recalculer les totaux
      await fetchCommande()
      
      setLigneEnEdition(null)
      toast.success('Ligne mise à jour avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour de la ligne')
    }
  }

  const handleDeleteLigne = async (id: number) => {
    if (!commande) return
    
    if (commande.estVerrouillee) {
      toast.error('La commande est verrouillée et ne peut pas être modifiée')
      return
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/lignes/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de la ligne')
      }
      
      // Mettre à jour l'UI
      setCommande({
        ...commande,
        lignes: commande.lignes.filter(l => l.id !== id)
      })
      
      // Recalculer les totaux
      await fetchCommande()
      
      toast.success('Ligne supprimée avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de la ligne')
    }
  }

  const handleInputChange = (id: number, field: keyof LigneCommande, value: string | number) => {
    setLignesTemp(prev => {
      const ligneTemp = prev[id] || {}
      let nouvelleValeur = value
      
      // Convertir en nombre si nécessaire
      if (field === 'prixUnitaire' || field === 'quantite') {
        nouvelleValeur = parseFloat(value as string) || 0
      }
      
      // Mettre à jour le total
      const updatedLigne = {
        ...ligneTemp,
        [field]: nouvelleValeur
      } as LigneCommande
      
      if (field === 'prixUnitaire' || field === 'quantite') {
        updatedLigne.total = updatedLigne.prixUnitaire * updatedLigne.quantite
      }
      
      return { ...prev, [id]: updatedLigne }
    })
  }

  const handleVerrouillage = async () => {
    if (!commande) return
    
    try {
      setLoading(true)
      const action = commande.estVerrouillee ? 'unlock' : 'validate'
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/${action}`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error(`Erreur lors du ${commande.estVerrouillee ? 'déverrouillage' : 'verrouillage'} de la commande`)
      }
      
      // Mettre à jour l'UI
      setCommande({
        ...commande,
        estVerrouillee: !commande.estVerrouillee,
        statut: commande.estVerrouillee ? 'BROUILLON' : 'VALIDEE'
      })
      
      toast.success(`Commande ${commande.estVerrouillee ? 'déverrouillée' : 'verrouillée'} avec succès`)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(`Erreur lors du ${commande.estVerrouillee ? 'déverrouillage' : 'verrouillage'} de la commande`)
    } finally {
      setLoading(false)
    }
  }

  const handleGenererPDF = () => {
    if (!commande) return
    
    window.open(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/pdf`, '_blank')
  }

  const handleEnvoyerEmail = async () => {
    if (!commande) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/send-email`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email')
      }
      
      toast.success('Email envoyé avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'envoi de l\'email')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="container mx-auto py-6">
      <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
        {error}
      </div>
      <div className="mt-4">
        <Link
          href={`/chantiers/${params.chantierId}/etats`}
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Retour
        </Link>
      </div>
    </div>
  )

  if (!commande) return (
    <div className="container mx-auto py-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
        Commande non trouvée
      </div>
      <div className="mt-4">
        <Link
          href={`/chantiers/${params.chantierId}/etats`}
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Retour
        </Link>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto py-6">
      <Toaster position="top-right" />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <Link
                href={`/chantiers/${params.chantierId}/etats`}
                className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md transition-all hover:shadow-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                  {commande.estVerrouillee ? (
                    <span className="flex items-center">
                      <LockClosedIcon className="h-5 w-5 mr-2 text-orange-500" />
                      Commande verrouillée
                    </span>
                  ) : (
                    <>Commande sous-traitant</>
                  )}
                </h1>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                    <DocumentCheckIcon className="h-4 w-4 mr-1 text-blue-500" />
                    {commande.reference || `Commande #${commande.id}`} - {commande.soustraitantNom}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {commande.estVerrouillee && (
                <>
                  <button
                    onClick={handleGenererPDF}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Télécharger PDF
                  </button>
                  
                  {commande.soustraitantEmail && (
                    <button
                      onClick={handleEnvoyerEmail}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Envoyer par email
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={handleVerrouillage}
                className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-orange-600 hover:bg-orange-500 dark:bg-orange-700 dark:hover:bg-orange-600"
              >
                {commande.estVerrouillee ? (
                  <>
                    <LockOpenIcon className="h-5 w-5 mr-2" />
                    Déverrouiller
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="h-5 w-5 mr-2" />
                    Valider et verrouiller
                  </>
                )}
              </button>
              
              {/* Si verrouillée, proposer l'ajout d'un état d'avancement */}
              {commande.estVerrouillee && (
                <Link
                  href={`/chantiers/${params.chantierId}/etats/soustraitants/${params.soustraitantId}/etat/nouveau`}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 dark:bg-purple-700 dark:hover:bg-purple-600"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Créer un état d'avancement
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="p-6">
          {/* Tableau des lignes */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-16">
                    Art.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-20">
                    Unité
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-24">
                    P.U. (€)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-24">
                    Quant.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-28">
                    Total (€)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                {commande.lignes.map((ligne) => (
                  <tr key={ligne.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ligne.article}
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {ligneEnEdition === ligne.id ? (
                        <textarea
                          value={lignesTemp[ligne.id]?.description || ''}
                          onChange={(e) => handleInputChange(ligne.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 dark:border-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          rows={3}
                        />
                      ) : (
                        ligne.description
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ligne.unite}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {ligneEnEdition === ligne.id ? (
                        <input
                          type="number"
                          value={lignesTemp[ligne.id]?.prixUnitaire || 0}
                          onChange={(e) => handleInputChange(ligne.id, 'prixUnitaire', e.target.value)}
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1 border border-blue-300 dark:border-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-right"
                        />
                      ) : (
                        ligne.prixUnitaire.toLocaleString('fr-FR')
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {ligneEnEdition === ligne.id ? (
                        <input
                          type="number"
                          value={lignesTemp[ligne.id]?.quantite || 0}
                          onChange={(e) => handleInputChange(ligne.id, 'quantite', e.target.value)}
                          step="0.01"
                          min="0"
                          className="w-full px-2 py-1 border border-blue-300 dark:border-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-right"
                        />
                      ) : (
                        ligne.quantite.toLocaleString('fr-FR')
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                      {ligneEnEdition === ligne.id 
                        ? (lignesTemp[ligne.id]?.prixUnitaire * lignesTemp[ligne.id]?.quantite).toLocaleString('fr-FR')
                        : ligne.total.toLocaleString('fr-FR')
                      }
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        {ligneEnEdition === ligne.id ? (
                          <>
                            <button
                              onClick={() => handleSaveLigne(ligne.id)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Enregistrer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Annuler"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            {!commande.estVerrouillee && (
                              <>
                                <button
                                  onClick={() => handleEditLigne(ligne.id)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Modifier"
                                  disabled={commande.estVerrouillee}
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLigne(ligne.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Supprimer"
                                  disabled={commande.estVerrouillee}
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Résumé financier */}
          <div className="mt-8 flex justify-end">
            <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-800 dark:text-gray-200 font-semibold">Total HT:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-xl">{commande.sousTotal.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 