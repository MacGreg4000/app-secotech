'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  DocumentIcon, 
  ArrowUpTrayIcon,
  TrashIcon,
  FolderIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface Document {
  id: string
  nom: string
  type: string
  taille: number
  dateUpload: string
  url: string
}

export default function DocumentsAdministratifsPage() {
  const { data: session } = useSession()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents/administratifs')
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des documents')
      }
      const data = await response.json()
      setDocuments(data)
    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible de charger les documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/documents/administratifs/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du document')
      }

      await fetchDocuments() // Recharger la liste des documents
    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible d\'uploader le document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

    try {
      const response = await fetch(`/api/documents/administratifs/${documentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du document')
      }

      await fetchDocuments() // Recharger la liste des documents
    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible de supprimer le document')
    }
  }

  const handlePreview = (doc: Document) => {
    setPreviewDocument(doc)
  }

  const closePreview = () => {
    setPreviewDocument(null)
  }

  const renderPreview = () => {
    if (!previewDocument) return null

    const fileType = previewDocument.type.toLowerCase()
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)
    const isPDF = fileType === 'pdf'
    const isText = ['txt', 'md', 'csv'].includes(fileType)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium">{previewDocument.nom}</h3>
            <button
              onClick={closePreview}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-4 overflow-auto max-h-[calc(90vh-4rem)]">
            {isImage && (
              <div className="flex justify-center">
                <img
                  src={previewDocument.url}
                  alt={previewDocument.nom}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            {isPDF && (
              <div className="w-full h-[calc(90vh-8rem)]">
                <iframe
                  src={`${previewDocument.url}#toolbar=0`}
                  className="w-full h-full rounded-lg shadow-lg"
                  title={previewDocument.nom}
                />
              </div>
            )}
            {isText && (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                <p className="text-gray-500">Prévisualisation non disponible pour les fichiers texte</p>
              </pre>
            )}
            {!isImage && !isPDF && !isText && (
              <p className="text-gray-500">Prévisualisation non disponible pour ce type de fichier</p>
            )}
          </div>
          
          <div className="flex justify-end p-4 border-t">
            <a
              href={previewDocument.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Télécharger
            </a>
          </div>
        </div>
      </div>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FolderIcon className="h-8 w-8 mr-2 text-blue-500" />
            Documents administratifs
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Gérez les documents administratifs de l'entreprise
          </p>
        </div>

        <div className="relative">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            {uploading ? 'Upload en cours...' : 'Ajouter un document'}
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {documents.length === 0 ? (
            <li className="px-4 py-8 text-center text-gray-500">
              Aucun document administratif disponible
            </li>
          ) : (
            documents.map((doc) => (
              <li key={doc.id} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DocumentIcon className="h-6 w-6 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.nom}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(doc.taille)} • {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handlePreview(doc)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Prévisualiser"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Télécharger"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {renderPreview()}
    </div>
  )
} 