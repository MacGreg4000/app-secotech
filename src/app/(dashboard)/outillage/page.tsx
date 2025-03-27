'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  PlusIcon, 
  QrCodeIcon,
  ArrowPathIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface Machine {
  id: string
  nom: string
  modele: string
  localisation: string
  statut: 'DISPONIBLE' | 'PRETE' | 'EN_PANNE' | 'EN_REPARATION' | 'MANQUE_CONSOMMABLE'
}

export default function OutillagePage() {
  const { data: session } = useSession()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    fetchMachines()
  }, [])

  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/outillage/machines')
      if (!response.ok) throw new Error('Erreur lors de la récupération des machines')
      const data = await response.json()
      setMachines(data)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatutStyle = (statut: Machine['statut']) => {
    const styles = {
      DISPONIBLE: 'bg-green-100 text-green-800',
      PRETE: 'bg-blue-100 text-blue-800',
      EN_PANNE: 'bg-red-100 text-red-800',
      EN_REPARATION: 'bg-yellow-100 text-yellow-800',
      MANQUE_CONSOMMABLE: 'bg-orange-100 text-orange-800'
    }
    return styles[statut]
  }

  const handleDeleteClick = (machineId: string) => {
    setMachineToDelete(machineId)
  }

  const confirmDelete = async () => {
    if (!machineToDelete) return
    
    try {
      setDeleteError(null)
      const response = await fetch(`/api/outillage/machines/${machineToDelete}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Réponse d\'erreur:', response.status, errorData)
        throw new Error(errorData.error || `Erreur lors de la suppression (${response.status})`)
      }
      
      // Mettre à jour la liste des machines
      setMachines(machines.filter(machine => machine.id !== machineToDelete))
      setMachineToDelete(null)
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error)
      setDeleteError(error.message || 'Erreur inconnue lors de la suppression')
    }
  }

  const cancelDelete = () => {
    setMachineToDelete(null)
    setDeleteError(null)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Outillage</h1>
          <p className="mt-2 text-sm text-gray-700">
            Liste des machines et outils disponibles
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-3">
          <Link
            href="/outillage/scanner"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:w-auto"
          >
            <QrCodeIcon className="h-4 w-4 mr-2" />
            Scanner
          </Link>
          <Link
            href="/outillage/nouveau"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nouvelle machine
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-gray-700 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Nom
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Modèle
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Localisation
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Statut
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {machines.map((machine) => (
                    <tr key={machine.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-200">
                        {machine.nom}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {machine.modele}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {machine.localisation}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatutStyle(machine.statut)}`}>
                          {machine.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end space-x-3">
                        <Link
                          href={`/outillage/${machine.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteClick(machine.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {machineToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Confirmer la suppression</h3>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {deleteError}
              </div>
            )}
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer cette machine ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 