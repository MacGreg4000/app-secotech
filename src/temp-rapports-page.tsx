'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DocumentTextIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useSession } from 'next-auth/react'

interface RapportVisite {
  id: number
  nom: string
  url: string
  createdAt: string
  createdBy: string
  user: {
    name: string
  }
}

export default function RapportsVisitePage({ params }: { params: { chantierId: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [rapports, setRapports] = useState<RapportVisite[]>([])
  const [loading, setLoading] = useState(true)
  const [chantier, setChantier] = useState<any>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  
  // Ajouter des logs pour déboguer
  useEffect(() => {
    console.log('Session actuelle:', session)
    console.log('Rôle utilisateur:', session?.user?.role)
  }, [session])

  useEffect(() => {
    // Charger les informations du chantier
    fetch(`/api/chantiers/${params.chantierId}`)
      .then(res => res.json())
      .then(data => {
        setChantier(data)
      })
      .catch(error => {
        console.error('Erreur lors du chargement du chantier:', error)
      })

    // Charger les rapports de visite (filtrer les documents de type "rapport-visite")
    fetch(`/api/chantiers/${params.chantierId}/documents`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filtrer pour ne garder que les documents de type "rapport-visite"
          const rapportsVisite = data.filter(doc => doc.type === 'rapport-visite')
          setRapports(rapportsVisite)
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Erreur lors du chargement des rapports:', error)
        setLoading(false)
      })
  }, [params.chantierId])

  // Fonction pour supprimer un rapport
  const handleDeleteRapport = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport ? Cette action est irréversible.')) {
      return
    }
    
    setDeleting(id)
    
    try {
      const response = await fetch(`/api/chantiers/${params.chantierId}/documents?documentId=${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la suppression du rapport')
      }
      
      // Mettre à jour la liste des rapports
      setRapports(rapports.filter(rapport => rapport.id !== id))
      
    } catch (error: any) {
      console.error('Erreur lors de la suppression du rapport:', error)
      alert(`Erreur: ${error.message}`)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Rapports de visite - {chantier?.nomChantier || 'Chargement...'}
        </h1>
        <Link
          href={`/chantiers/${params.chantierId}/rapports/nouveau`}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          <PlusIcon className="h-5 w-5" />
          Nouveau rapport
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Chargement des rapports...</p>
        </div>
      ) : rapports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun rapport de visite</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Commencez par créer un nouveau rapport de visite pour ce chantier.
          </p>
          <div className="mt-6">
            <Link
              href={`/chantiers/${params.chantierId}/rapports/nouveau`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Nouveau rapport
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {rapports.map((rapport) => (
              <li key={rapport.id} className="relative">
                <div className="flex justify-between items-center">
                  <a
                    href={rapport.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700 flex-grow"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <p className="text-sm font-medium text-blue-600 truncate dark:text-blue-400">
                            {rapport.nom}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            PDF
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            Créé par {rapport.user?.name || 'Utilisateur inconnu'}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 dark:text-gray-400">
                          <p>
                            {format(new Date(rapport.createdAt), 'PPP', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </a>
                  
                  {/* Bouton de suppression toujours visible */}
                  <div className="pr-4">
                    <button
                      onClick={() => handleDeleteRapport(rapport.id)}
                      disabled={deleting === rapport.id}
                      className="flex items-center bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/50 px-3 py-2 rounded transition-colors"
                      title="Supprimer ce rapport"
                    >
                      {deleting === rapport.id ? (
                        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></span>
                      ) : (
                        <TrashIcon className="h-5 w-5 mr-2" />
                      )}
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
} 