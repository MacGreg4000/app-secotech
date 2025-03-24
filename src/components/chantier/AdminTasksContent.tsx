'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const ADMIN_TASKS = [
  {
    taskType: 'declaration_chantier',
    label: 'Déclaration de chantier'
  },
  {
    taskType: 'cautionnement_collectif',
    label: 'Cautionnement collectif'
  },
  {
    taskType: 'declaration_sous_traitance',
    label: 'Déclaration de sous-traitance'
  },
  {
    taskType: 'fiche_technique',
    label: 'Fiche technique'
  }
]

export function AdminTasksContent({ chantierId }: { chantierId: string }) {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [chantierId])

  const fetchTasks = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/chantiers/${chantierId}/admin-tasks`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Erreur ${response.status}: ${errorData.error || response.statusText}`)
      }
      const data = await response.json()
      setTasks(data)
    } catch (error: any) {
      console.error('Erreur lors de la récupération des tâches:', error)
      setError(`Erreur lors de la récupération des tâches: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTask = async (taskType: string) => {
    try {
      setError(null)
      console.log(`Mise à jour de la tâche ${taskType} pour le chantier ${chantierId}`)
      
      const response = await fetch(`/api/chantiers/${chantierId}/admin-tasks/${taskType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Réponse d\'erreur:', response.status, errorData)
        throw new Error(`Erreur ${response.status}: ${errorData.error || response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Réponse de mise à jour:', data)
      
      // Mettre à jour localement la tâche pour éviter un rechargement complet
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks]
        const taskIndex = updatedTasks.findIndex(t => t.taskType === taskType)
        
        if (taskIndex >= 0) {
          // Mettre à jour la tâche existante
          updatedTasks[taskIndex] = data
        } else {
          // Ajouter la nouvelle tâche
          updatedTasks.push(data)
        }
        
        return updatedTasks
      })
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour de la tâche:', error)
      setError(`Erreur lors de la mise à jour de la tâche: ${error.message}`)
    }
  }

  if (loading) return <div>Chargement...</div>

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
          {error}
        </div>
      )}
      
      {ADMIN_TASKS.map((taskConfig) => {
        const task = tasks.find(t => t.taskType === taskConfig.taskType)
        return (
          <div key={taskConfig.taskType} className="flex items-center p-4 bg-white rounded-lg shadow">
            <button
              onClick={() => handleToggleTask(taskConfig.taskType)}
              className={`flex items-center justify-center w-5 h-5 border-2 rounded mr-3
                hover:border-green-600 transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                disabled:opacity-50
                ${task?.completed ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}
            >
              {task?.completed && <CheckIcon className="w-4 h-4 text-white" />}
            </button>
            
            <div className="flex-grow">
              <span className={`text-gray-700 ${task?.completed ? 'line-through text-gray-400' : ''}`}>
                {taskConfig.label}
              </span>
              
              {task?.completed && task.completedAt && (
                <div className="text-sm text-gray-500 mt-1">
                  Validé par {task.user?.name || task.user?.email} le{' '}
                  {format(new Date(task.completedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
} 