'use client'
import { useState, useEffect } from 'react'
import { PencilIcon, CheckIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

export default function UserNotepad({ userId }: { userId: string }) {
  const [content, setContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // Charger les notes de l'utilisateur au chargement du composant
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/notes`)
        if (response.ok) {
          const data = await response.json()
          setContent(data.content || '')
          setLastSaved(data.updatedAt ? new Date(data.updatedAt).toLocaleString('fr-FR') : null)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des notes:', error)
      }
    }

    fetchNotes()
  }, [userId])

  // Fonction pour sauvegarder les notes
  const saveNotes = async () => {
    if (!content.trim() && !confirm('Voulez-vous vraiment enregistrer un tableau blanc vide ?')) {
      return
    }
    
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/users/${userId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setLastSaved(new Date(data.updatedAt).toLocaleString('fr-FR'))
        toast.success('Notes enregistrées')
        setIsEditing(false)
      } else {
        throw new Error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes:', error)
      toast.error('Erreur lors de la sauvegarde des notes')
    } finally {
      setIsSaving(false)
    }
  }

  // Fonction pour gérer les raccourcis clavier (Ctrl+S pour sauvegarder)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveNotes()
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/30 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          Mon tableau blanc
          {lastSaved && (
            <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">
              Dernière modification: {lastSaved}
            </span>
          )}
        </h3>
        <button
          onClick={() => isEditing ? saveNotes() : setIsEditing(true)}
          className={`p-2 rounded-full ${
            isEditing 
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-200'
              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-800 dark:text-indigo-200'
          }`}
          disabled={isSaving}
        >
          {isEditing ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <PencilIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      <div className="p-4">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Notez vos idées, tâches, rappels..."
            autoFocus
          />
        ) : (
          <div 
            className="w-full h-64 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-md overflow-auto whitespace-pre-wrap border border-indigo-100 dark:border-indigo-900/30"
            onClick={() => setIsEditing(true)}
          >
            {content || (
              <span className="text-gray-400 dark:text-gray-500 italic">
                Cliquez pour ajouter des notes...
              </span>
            )}
          </div>
        )}
        
        {isEditing && (
          <div className="mt-4 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <div>
              <span>Appuyez sur </span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+S</kbd>
              <span> pour sauvegarder</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                disabled={isSaving}
              >
                Annuler
              </button>
              <button
                onClick={saveNotes}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 