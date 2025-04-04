'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import GanttChart from '@/components/dashboard/GanttChart'

interface Chantier {
  id: string
  title: string
  start: string
  end: string | null
  client: string
  etat: string
}

export default function Planning() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChantiers()
  }, [])

  const fetchChantiers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/planning/chantiers')
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des chantiers')
      }
      
      const data = await response.json()
      setChantiers(data)
    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible de charger les chantiers. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-8 w-8 mr-2 text-blue-500" />
            Planning des chantiers
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Vue d'ensemble des chantiers dans le temps
          </p>
        </div>
        
        <button 
          onClick={() => fetchChantiers()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Actualiser
        </button>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <GanttChart chantiers={chantiers} loading={loading} />
    </div>
  )
} 