'use client'
import { useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import DepenseForm from './DepenseForm'
import DepenseList from './DepenseList'
import { Toaster } from 'react-hot-toast'

interface DepenseSectionProps {
  chantierId: string
}

export default function DepenseSection({ chantierId }: DepenseSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingDepenseId, setEditingDepenseId] = useState<string | undefined>(undefined)
  const [key, setKey] = useState(0) // Pour forcer le rechargement de la liste

  const handleAddClick = () => {
    setEditingDepenseId(undefined)
    setShowForm(true)
  }

  const handleEditClick = (depenseId: string) => {
    setEditingDepenseId(depenseId)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingDepenseId(undefined)
    // Forcer le rechargement de la liste
    setKey(prev => prev + 1)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingDepenseId(undefined)
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {!showForm && (
        <div className="flex justify-end">
          <button
            onClick={handleAddClick}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Ajouter une dépense
          </button>
        </div>
      )}
      
      {showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {editingDepenseId ? 'Modifier la dépense' : 'Ajouter une dépense'}
          </h3>
          <DepenseForm
            chantierId={chantierId}
            depenseId={editingDepenseId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Liste des dépenses
            </h3>
          </div>
          <div className="p-6">
            <DepenseList
              key={key}
              chantierId={chantierId}
              onEdit={handleEditClick}
            />
          </div>
        </div>
      )}
    </div>
  )
} 