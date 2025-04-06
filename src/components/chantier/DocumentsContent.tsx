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
  const [photos, setPhotos] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<'documents' | 'photos'>('documents')

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
      
      // Séparer les photos des autres documents
      const photosArray = data.filter((doc: Document) => doc.type === 'photo-chantier')
      const documentsArray = data.filter((doc: Document) => 
        doc.type !== 'rapport-visite' && 
        doc.type !== 'justificatif-depense' && 
        doc.type !== 'photo-chantier'
      )
      
      setPhotos(photosArray)
      setDocuments(documentsArray)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType?: string) => {
    if (!e.target.files?.length) return

    setUploading(true)
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)
    
    // Ajouter le type de fichier si spécifié (photo-chantier)
    if (fileType) {
      formData.append('type', fileType)
    }

    try {
      const res = await fetch(`/api/chantiers/${chantierId}/documents`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error('Erreur lors du téléchargement')

      const newDocument = await res.json()
      
      // Ajouter le document à la liste appropriée
      if (newDocument.type === 'photo-chantier') {
        setPhotos(prev => [newDocument, ...prev])
      } else if (newDocument.type !== 'rapport-visite' && newDocument.type !== 'justificatif-depense') {
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
        
        // Définir le type en fonction de l'onglet actif
        if (activeTab === 'photos') {
          formData.append('type', 'photo-chantier')
        }

        const res = await fetch(`/api/chantiers/${chantierId}/documents`, {
          method: 'POST',
          body: formData
        })

        if (!res.ok) throw new Error('Erreur lors du téléchargement')

        const newDocument = await res.json()
        
        // Ajouter le document à la liste appropriée
        if (newDocument.type === 'photo-chantier') {
          setPhotos(prev => [newDocument, ...prev])
        } else if (newDocument.type !== 'rapport-visite' && newDocument.type !== 'justificatif-depense') {
          setDocuments(prev => [newDocument, ...prev])
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setUploading(false)
    }
  }, [chantierId, activeTab])

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
      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'photos'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Photos de chantier
          </button>
        </nav>
      </div>

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
                : `Glissez et déposez vos ${activeTab === 'photos' ? 'photos' : 'fichiers'} ici ou`
            }
          </p>
          {!uploading && !isDragging && (
            <div className="relative">
              <input
                type="file"
                onChange={(e) => handleFileUpload(e, activeTab === 'photos' ? 'photo-chantier' : undefined)}
                className="hidden"
                id="file-upload"
                multiple
                accept={activeTab === 'photos' ? 'image/*' : undefined}
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors cursor-pointer"
              >
                {activeTab === 'photos' ? 'Sélectionner des photos' : 'Sélectionner des fichiers'}
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

      {/* Contenu spécifique à l'onglet */}
      {activeTab === 'documents' ? (
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nom
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date d'ajout
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ajouté par
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Taille
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {doc.nom}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {doc.user?.nom} {doc.user?.prenom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.taille)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
            Photos de chantier
          </h2>
          
          {photos.length === 0 ? (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Aucune photo pour ce chantier</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={photo.url} 
                      alt={photo.nom} 
                      className="w-full h-48 object-cover"
                    />
                  </a>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm truncate">{photo.nom}</p>
                    <p className="text-gray-300 text-xs">
                      {new Date(photo.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="absolute top-2 right-2 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Fonction utilitaire pour formater la taille des fichiers
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 