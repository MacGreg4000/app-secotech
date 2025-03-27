'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusIcon, DocumentIcon, CalendarIcon, TrashIcon } from '@heroicons/react/24/outline'

interface DossierTechnique {
  id: number
  chantierId: string
  nomChantier: string
  dateCreation: string
  nombreFiches: number
  fichierUrl: string
}

export default function FichesTechniquesPage() {
  const [dossiers, setDossiers] = useState<DossierTechnique[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchDossiers = async () => {
      try {
        const res = await fetch('/api/fiches-techniques/historique')
        if (res.ok) {
          const data = await res.json()
          setDossiers(data)
        } else {
          setError('Erreur lors du chargement des dossiers')
        }
      } catch (error) {
        setError('Erreur lors du chargement des dossiers')
      } finally {
        setLoading(false)
      }
    }

    const checkAdminStatus = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data = await res.json()
          setIsAdmin(data.role === 'ADMIN')
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error)
      }
    }

    fetchDossiers()
    checkAdminStatus()
  }, [])

  const handleDelete = async (documentId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier technique ?')) {
      return
    }

    try {
      const res = await fetch(`/api/fiches-techniques/${documentId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setDossiers(dossiers.filter(d => d.id !== documentId))
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      alert('Erreur lors de la suppression')
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Fiches Techniques</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Gérez vos fiches techniques et générez des dossiers personnalisés
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/administratif/fiches-techniques/nouveau"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nouveau dossier technique
          </Link>
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {dossiers.length === 0 ? (
            <li className="px-4 py-4 sm:px-6">
              <div className="text-center text-gray-500 dark:text-gray-400">
                Aucun dossier technique n'a encore été créé
              </div>
            </li>
          ) : (
            dossiers.map((dossier) => (
              <li key={dossier.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <DocumentIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-sm font-medium text-blue-600 truncate dark:text-blue-400">
                          Dossier technique - {dossier.nomChantier}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>
                          Créé le {new Date(dossier.dateCreation).toLocaleDateString('fr-FR')}
                        </span>
                        {dossier.nombreFiches > 0 && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{dossier.nombreFiches} fiches incluses</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                      <a
                        href={`/api/documents/download?path=${dossier.fichierUrl}`}
                        download
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Télécharger
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(dossier.id)}
                          className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Supprimer le dossier"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
} 