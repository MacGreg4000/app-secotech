'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DocumentTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'

interface BonRegie {
  id: number
  dates: string
  client: string
  nomChantier: string
  description: string
  dateSignature: string
  createdAt: string
}

// Exporter un composant qui n'utilise pas de rendu côté serveur
const BonsRegieWidget = dynamic(() => Promise.resolve(BonsRegieWidgetClient), {
  ssr: false,
})

export default BonsRegieWidget

// Définir le composant client
function BonsRegieWidgetClient() {
  const [bonsRegie, setBonsRegie] = useState<BonRegie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBonsRegie = async () => {
      try {
        const res = await fetch('/api/bon-regie?limit=5')
        
        if (!res.ok) {
          throw new Error('Erreur lors de la récupération des bons de régie')
        }
        
        const data = await res.json()
        setBonsRegie(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError("Impossible de charger les bons de régie")
      } finally {
        setLoading(false)
      }
    }

    fetchBonsRegie()
  }, [])
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-2/3"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="mb-4 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Derniers bons de régie
        </h2>
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Derniers bons de régie
        </h2>
        <Link 
          href="/(dashboard)/bons-regie" 
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
        >
          Voir tous
          <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
      
      {bonsRegie.length === 0 ? (
        <div className="text-center py-6">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Aucun bon de régie enregistré</p>
          <Link 
            href="/bon-regie" 
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Créer un bon de régie
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bonsRegie.map((bon) => (
            <div 
              key={bon.id} 
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <Link href={`/bons-regie/${bon.id}`} className="block">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {bon.description}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span className="font-medium">{bon.nomChantier}</span> - {bon.client}
                </p>
                <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Dates: {bon.dates}</span>
                  <span>
                    Signé le {format(new Date(bon.dateSignature), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
        <Link
          href="/bon-regie"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          Nouveau bon de régie
        </Link>
      </div>
    </div>
  )
} 