'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'

interface Document {
  id: number
  nom: string
  type: string
  url: string
  taille: number
  mimeType: string
  createdAt: string
  user: {
    nom: string
    prenom: string
  }
}

interface DocumentsContentProps {
  chantierId: string
}

export default function DocumentsContent({ chantierId }: DocumentsContentProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    fetchDocuments()
  }, [chantierId, status, router])

  const fetchDocuments = async () => {
    try {
      console.log('Fetching documents for chantier:', chantierId)
      const res = await fetch(`/api/chantiers/${chantierId}/documents`)
      
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Response not OK:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData
        })
        throw new Error(errorData.error || 'Erreur lors de la récupération des documents')
      }
      
      const data = await res.json()
      console.log('Documents received:', data)
      
      // Filtrer pour exclure les documents de type "rapport-visite" et "justificatif-depense"
      const filteredDocuments = data.filter((doc: Document) => 
        doc.type !== 'rapport-visite' && doc.type !== 'justificatif-depense'
      )
      setDocuments(filteredDocuments)
      
      setError(null)
    } catch (error) {
      console.error('Erreur complète dans fetchDocuments:', {
        error,
        message: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
        stack: error instanceof Error ? error.stack : undefined
      })
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return

    setUploading(true)
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/chantiers/${chantierId}/documents`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Erreur lors du téléchargement')

      const newDocument = await res.json()
      
      // Vérifier que le document n'est pas un rapport de visite ou un justificatif de dépense
      if (newDocument.type !== 'rapport-visite' && newDocument.type !== 'justificatif-depense') {
        setDocuments(prev => [newDocument, ...prev])
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: number) => {
    try {
      const res = await fetch(`/api/chantiers/${chantierId}/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Erreur lors de la suppression')

      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    } catch (error) {
      console.error('Erreur:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    }
  }

  // Gestionnaire de drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    setUploading(true)
    
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`/api/chantiers/${chantierId}/documents`, {
          method: 'POST',
          body: formData
        })

        if (!res.ok) throw new Error('Erreur lors du téléchargement')

        const newDocument = await res.json()
        
        // Vérifier que le document n'est pas un rapport de visite ou un justificatif de dépense
        if (newDocument.type !== 'rapport-visite' && newDocument.type !== 'justificatif-depense') {
          setDocuments(prev => [newDocument, ...prev])
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setUploading(false)
    }
  }, [chantierId])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )
  
  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      {error}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Zone de drag & drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center
          transition-colors duration-200 ease-in-out
          ${isDragging 
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' 
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
          }
        `}
      >
        <div className="flex flex-col items-center">
          <ArrowUpTrayIcon className={`h-12 w-12 mb-4 ${isDragging ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {uploading 
              ? 'Téléchargement en cours...'
              : isDragging
                ? 'Déposez les fichiers ici'
                : 'Glissez et déposez vos fichiers ici ou'
            }
          </p>
          {!uploading && !isDragging && (
            <div className="relative">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                multiple
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors cursor-pointer"
              >
                Sélectionner des fichiers
              </label>
            </div>
          )}
          {uploading && (
            <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Traitement en cours...
            </div>
          )}
        </div>
      </div>

      {/* Liste des documents */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
          Documents partagés
        </h2>
        
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">Aucun document partagé pour ce chantier</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex-1">
                  <a 
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {doc.nom}
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ajouté par {doc.user.prenom} {doc.user.nom} le{' '}
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Supprimer"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 