'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  PlusIcon, 
  PencilSquareIcon, 
  UserGroupIcon,
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { SearchInput } from '@/components/ui'
import { useRouter } from 'next/navigation'

interface SousTraitant {
  id: string
  nom: string
  email: string
  contact: string | null
  telephone: string | null
  adresse: string | null
  _count: {
    ouvriers: number
  }
  contrats?: {
    id: string
    url: string
    estSigne: boolean
    dateGeneration: string
  }[]
}

interface DeleteModalProps {
  isOpen: boolean
  sousTraitant: SousTraitant | null
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

function DeleteModal({ isOpen, sousTraitant, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Confirmer la suppression</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer le sous-traitant "{sousTraitant?.nom}" ? 
          Cette action est irréversible et supprimera également tous les ouvriers associés.
        </p>
        <div className="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SousTraitantsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [sousTraitants, setSousTraitants] = useState<SousTraitant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtreNom, setFiltreNom] = useState('')
  const [deleteModal, setDeleteModal] = useState<DeleteModalProps>({
    isOpen: false,
    sousTraitant: null,
    onClose: () => setDeleteModal(prev => ({ ...prev, isOpen: false })),
    onConfirm: async () => {},
    isDeleting: false
  })
  const [generatingContract, setGeneratingContract] = useState<string | null>(null)
  const [sendingContract, setSendingContract] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetch('/api/sous-traitants')
        .then(res => res.json())
        .then(data => {
          setSousTraitants(data)
          setLoading(false)
        })
        .catch(error => {
          console.error('Erreur:', error)
          setError('Erreur lors du chargement des sous-traitants')
          setLoading(false)
        })
    }
  }, [session])

  const handleDelete = async () => {
    if (!deleteModal.sousTraitant) return

    setDeleteModal(prev => ({ ...prev, isDeleting: true }))
    try {
      const response = await fetch(`/api/sous-traitants/${deleteModal.sousTraitant.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Mettre à jour la liste
      setSousTraitants(prev => 
        prev.filter(st => st.id !== deleteModal.sousTraitant?.id)
      )
      setDeleteModal(prev => ({ ...prev, isOpen: false }))
    } catch (error) {
      console.error('Erreur:', error)
      // Gérer l'erreur ici
    } finally {
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const genererContrat = async (soustraitantId: string) => {
    try {
      setGeneratingContract(soustraitantId)
      const response = await fetch(`/api/sous-traitants/${soustraitantId}/generer-contrat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du contrat')
      }

      const data = await response.json()
      
      // Ouvrir le contrat dans un nouvel onglet
      window.open(data.url, '_blank')
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la génération du contrat')
    } finally {
      setGeneratingContract(null)
    }
  }

  const envoyerContrat = async (soustraitantId: string) => {
    try {
      setSendingContract(soustraitantId)
      const response = await fetch(`/api/sous-traitants/${soustraitantId}/envoyer-contrat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'envoi du contrat')
      }

      alert('Le contrat a été envoyé avec succès au sous-traitant')
    } catch (error: any) {
      console.error('Erreur:', error)
      alert(error.message || 'Erreur lors de l\'envoi du contrat')
    } finally {
      setSendingContract(null)
    }
  }

  // Filtrer les sous-traitants par nom
  const sousTraitantsFiltres = sousTraitants.filter(st => 
    st.nom.toLowerCase().includes(filtreNom.toLowerCase())
  )

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sous-Traitants</h1>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/sous-traitants/nouveau"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nouveau sous-traitant
          </Link>
        </div>
      </div>

      <div className="mt-4 mb-6">
        <SearchInput
          id="search"
          placeholder="Rechercher un sous-traitant..."
          value={filtreNom}
          onChange={(e) => setFiltreNom(e.target.value)}
        />
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Nom</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Contact</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Email</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Téléphone</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Contrat</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Ouvriers</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {Array.isArray(sousTraitantsFiltres) && sousTraitantsFiltres.map((st) => (
                    <tr key={st.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-200">{st.nom}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{st.contact}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{st.email}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{st.telephone}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col space-y-2">
                          {st.contrats && st.contrats.length > 0 && st.contrats[0].estSigne ? (
                            <a
                              href={st.contrats[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                            >
                              <DocumentTextIcon className="h-4 w-4 mr-1" />
                              Contrat signé
                            </a>
                          ) : (
                            <button
                              onClick={() => genererContrat(st.id)}
                              disabled={generatingContract === st.id}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
                            >
                              {generatingContract === st.id ? (
                                <span className="flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-700 dark:text-indigo-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Génération...
                                </span>
                              ) : (
                                <>
                                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                                  Générer contrat
                                </>
                              )}
                            </button>
                          )}
                          
                          {st.contrats && st.contrats.length > 0 && !st.contrats[0].estSigne && (
                            <a
                              href={st.contrats[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                            >
                              <DocumentTextIcon className="h-4 w-4 mr-1" />
                              Voir contrat généré
                            </a>
                          )}
                          
                          {(!st.contrats || st.contrats.length === 0 || !st.contrats[0].estSigne) && (
                            <button
                              onClick={() => envoyerContrat(st.id)}
                              disabled={sendingContract === st.id}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                            >
                              {sendingContract === st.id ? (
                                <span className="flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-700 dark:text-green-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Envoi...
                                </span>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Envoyer contrat
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <Link 
                          href={`/sous-traitants/${st.id}/ouvriers`}
                          className="flex items-center text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {st._count.ouvriers} ouvriers
                        </Link>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/sous-traitants/${st.id}/edit`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              sousTraitant: st,
                              onClose: () => setDeleteModal(prev => ({ ...prev, isOpen: false })),
                              onConfirm: handleDelete,
                              isDeleting: false
                            })}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <TrashIcon className="h-5 w-5" />
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

      <DeleteModal
        isOpen={deleteModal.isOpen}
        sousTraitant={deleteModal.sousTraitant}
        onClose={deleteModal.onClose}
        onConfirm={deleteModal.onConfirm}
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  )
} 