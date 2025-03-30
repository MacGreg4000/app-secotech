'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PlusIcon, DocumentTextIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'

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

export default function RapportsVisitePage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const { data: session } = useSession()
  const [rapports, setRapports] = useState<RapportVisite[]>([])
  const [chantier, setChantier] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChantier = async () => {
      try {
        const res = await fetch(`/api/chantiers/${params.chantierId}`)
        if (!res.ok) throw new Error('Erreur lors de la récupération du chantier')
        const data = await res.json()
        setChantier(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
      }
    }

    const fetchRapports = async () => {
      try {
        const res = await fetch(`/api/chantiers/${params.chantierId}/documents`)
        if (!res.ok) throw new Error('Erreur lors de la récupération des documents')
        const data = await res.json()
        
        if (Array.isArray(data)) {
          const rapportsVisite = data.filter(doc => doc.type === 'rapport-visite')
          setRapports(rapportsVisite)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des rapports')
      } finally {
        setLoading(false)
      }
    }

    fetchChantier()
    fetchRapports()
  }, [params.chantierId])

  const handleDeleteRapport = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rapport ?')) return

    try {
      const res = await fetch(`/api/chantiers/${params.chantierId}/documents/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Erreur lors de la suppression')

      setRapports(prev => prev.filter(rapport => rapport.id !== id))
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la suppression du rapport')
    }
  }

  return (
    <div className="container mx-auto py-6">
      <DocumentExpirationAlert />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/chantiers/${params.chantierId}/etats`)}
                className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md transition-all hover:shadow-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                  Rapports de visite
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
            <Link
              href={`/chantiers/${params.chantierId}/rapports/nouveau`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center shadow-md transition-all hover:shadow-lg border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nouveau rapport
            </Link>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
              {error}
            </div>
          ) : rapports.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucun rapport de visite</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Vous n'avez pas encore créé de rapport de visite pour ce chantier. Les rapports vous permettent de documenter l'avancement des travaux.
              </p>
              <Link
                href={`/chantiers/${params.chantierId}/rapports/nouveau`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Créer un rapport
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Rapports disponibles
                </h2>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {rapports.map((rapport) => (
                  <li key={rapport.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" />
                        <div>
                          <a
                            href={rapport.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center"
                          >
                            {rapport.nom}
                          </a>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Créé par {rapport.user?.name || 'Utilisateur inconnu'} le{' '}
                            {new Date(rapport.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRapport(rapport.id)}
                        className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Supprimer ce rapport"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 