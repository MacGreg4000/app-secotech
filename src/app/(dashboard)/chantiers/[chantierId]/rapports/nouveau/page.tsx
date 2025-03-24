'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FormInput, FormTextarea } from '@/components/ui'
import { CameraIcon, UserIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

interface ChantierDetails {
  id: number
  chantierId: string
  nomChantier: string
  clientNom: string
  adresseChantier: string
}

interface PhotoAnnotee {
  id: string
  file: File
  preview: string
  annotation: string
}

interface PersonnePresente {
  id: string
  nom: string
  fonction: string
}

export default function NouveauRapportPage({ params }: { params: { chantierId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [chantier, setChantier] = useState<ChantierDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Champs du formulaire
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState<string>('')
  const [photos, setPhotos] = useState<PhotoAnnotee[]>([])
  const [personnes, setPersonnes] = useState<PersonnePresente[]>([])
  
  // Champs temporaires pour l'ajout de personnes
  const [nouveauNom, setNouveauNom] = useState<string>('')
  const [nouvelleFonction, setNouvelleFonction] = useState<string>('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Charger les informations du chantier
    fetch(`/api/chantiers/${params.chantierId}`)
      .then(res => res.json())
      .then(data => {
        setChantier(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Erreur lors du chargement du chantier:', error)
        setError('Impossible de charger les informations du chantier')
        setLoading(false)
      })
  }, [params.chantierId])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        preview: URL.createObjectURL(file),
        annotation: ''
      }))
      
      setPhotos(prev => [...prev, ...newPhotos])
    }
  }

  const handleAnnotationChange = (id: string, annotation: string) => {
    setPhotos(prev => 
      prev.map(photo => 
        photo.id === id ? { ...photo, annotation } : photo
      )
    )
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => {
      const updatedPhotos = prev.filter(photo => photo.id !== id)
      // Libérer les URL des objets pour éviter les fuites de mémoire
      const photoToRemove = prev.find(photo => photo.id === id)
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.preview)
      }
      return updatedPhotos
    })
  }

  const handleAddPersonne = () => {
    if (nouveauNom.trim() === '') return
    
    const nouvellePersonne: PersonnePresente = {
      id: Math.random().toString(36).substring(2, 9),
      nom: nouveauNom,
      fonction: nouvelleFonction
    }
    
    setPersonnes(prev => [...prev, nouvellePersonne])
    setNouveauNom('')
    setNouvelleFonction('')
  }

  const handleRemovePersonne = (id: string) => {
    setPersonnes(prev => prev.filter(personne => personne.id !== id))
  }

  const generatePDF = async () => {
    if (!chantier) return null
    
    // Créer un nouveau document PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    const dateFormatee = format(new Date(date), 'PPP', { locale: fr })
    
    // Ajouter l'en-tête
    doc.setFontSize(20)
    doc.text('Rapport de visite de chantier', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(`Chantier: ${chantier.nomChantier}`, 20, 40)
    doc.text(`Client: ${chantier.clientNom || 'Non spécifié'}`, 20, 50)
    doc.text(`Adresse: ${chantier.adresseChantier || 'Non spécifiée'}`, 20, 60)
    doc.text(`Date de visite: ${dateFormatee}`, 20, 70)
    
    // Ajouter la section des personnes présentes
    if (personnes.length > 0) {
      doc.text('Personnes présentes:', 20, 90)
      
      const personnesData = personnes.map(p => [p.nom, p.fonction])
      
      // Utiliser autoTable correctement
      autoTable(doc, {
        startY: 95,
        head: [['Nom', 'Fonction']],
        body: personnesData,
        theme: 'grid',
        headStyles: { fillColor: [66, 135, 245] }
      })
    }
    
    // Ajouter les notes
    // Obtenir la position Y après le tableau
    const finalY = (doc as any).lastAutoTable?.finalY || 100
    doc.text('Notes:', 20, finalY + 10)
    
    // Diviser les notes en lignes pour qu'elles tiennent dans la page
    const splitNotes = doc.splitTextToSize(notes || 'Aucune note', 170)
    doc.text(splitNotes, 20, finalY + 20)
    
    // Optimisation: limiter le nombre d'images
    const maxPhotos = Math.min(photos.length, 10)
    
    // Ajouter les photos avec leurs annotations
    if (maxPhotos > 0) {
      // Ajouter une page pour commencer les photos
      doc.addPage()
      
      // Définir la mise en page pour les photos (1 photo par page pour maximiser la qualité)
      for (let i = 0; i < maxPhotos; i++) {
        const photo = photos[i]
        
        // Ajouter une nouvelle page pour chaque photo (sauf la première qui est déjà sur une nouvelle page)
        if (i > 0) {
          doc.addPage()
        }
        
        try {
          // Méthode directe: utiliser directement le fichier image original
          // Créer un FileReader pour lire le fichier en tant que URL de données
          const reader = new FileReader()
          
          // Attendre que le fichier soit lu
          const imgData = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(photo.file)
          })
          
          // Charger l'image pour obtenir ses dimensions
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = imgData
          })
          
          // Calculer les dimensions pour le PDF (utiliser presque toute la largeur de la page)
          const pageWidth = 210 // A4 width in mm
          const pageHeight = 297 // A4 height in mm
          const margin = 20 // mm
          
          const maxWidth = pageWidth - (2 * margin) // 170mm
          const maxHeight = 200 // mm (laisser de l'espace pour l'annotation)
          
          // Calculer les dimensions proportionnelles
          const aspectRatio = img.width / img.height
          let pdfWidth = maxWidth
          let pdfHeight = pdfWidth / aspectRatio
          
          // Si la hauteur est trop grande, ajuster en fonction de la hauteur
          if (pdfHeight > maxHeight) {
            pdfHeight = maxHeight
            pdfWidth = pdfHeight * aspectRatio
          }
          
          // Centrer l'image horizontalement
          const xPos = (pageWidth - pdfWidth) / 2
          
          // Ajouter un titre pour la photo
          doc.setFontSize(14)
          doc.text(`Photo ${i + 1}`, pageWidth / 2, 30, { align: 'center' })
          
          // Ajouter l'image au PDF avec la meilleure qualité possible
          doc.addImage(imgData, 'JPEG', xPos, 40, pdfWidth, pdfHeight)
          
          // Ajouter l'annotation sous l'image
          if (photo.annotation) {
            doc.setFontSize(11)
            const annotationY = 40 + pdfHeight + 10
            const splitAnnotation = doc.splitTextToSize(photo.annotation, maxWidth)
            doc.text(splitAnnotation, margin, annotationY)
          }
          
        } catch (error) {
          console.error('Erreur lors de l\'ajout de l\'image au PDF:', error)
          // Continuer avec les autres images en cas d'erreur
        }
      }
      
      // Si on a limité le nombre d'images, ajouter une note
      if (photos.length > maxPhotos) {
        doc.addPage()
        doc.setFontSize(12)
        doc.text(`Note: ${photos.length - maxPhotos} autres photos n'ont pas été incluses dans ce PDF.`, 20, 30)
      }
    }
    
    // Ajouter le pied de page
    const totalPages = doc.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(10)
      doc.text(
        `Rapport généré le ${format(new Date(), 'PPP', { locale: fr })} par ${session?.user?.name || 'Utilisateur'}`,
        105,
        285,
        { align: 'center' }
      )
      doc.text(`Page ${i} / ${totalPages}`, 105, 290, { align: 'center' })
    }
    
    return doc
  }

  const handleDownloadPDF = async () => {
    setSaving(true)
    setError(null)
    
    try {
      console.log('Début de la génération du PDF pour téléchargement local')
      // Générer le PDF
      const doc = await generatePDF()
      if (!doc || !chantier) {
        throw new Error('Impossible de générer le PDF')
      }
      
      console.log('PDF généré avec succès')
      
      // Convertir le PDF en Blob
      const pdfBlob = doc.output('blob')
      console.log('Taille du PDF généré:', Math.round(pdfBlob.size / 1024), 'KB')
      
      // Créer un nom de fichier pour le PDF
      const dateStr = format(new Date(date), 'yyyy-MM-dd')
      const fileName = `rapport-visite-${chantier.nomChantier.replace(/\s+/g, '-')}-${dateStr}.pdf`
      
      // Télécharger le PDF localement
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      setError(`Une erreur est survenue lors de la génération du rapport: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      console.log('Début de la génération du PDF')
      // Générer le PDF
      const doc = await generatePDF()
      if (!doc || !chantier) {
        throw new Error('Impossible de générer le PDF')
      }
      
      console.log('PDF généré avec succès')
      
      // Convertir le PDF en Blob
      const pdfBlob = doc.output('blob')
      console.log('Taille du PDF généré:', Math.round(pdfBlob.size / 1024), 'KB')
      
      // Créer un nom de fichier pour le PDF
      const dateStr = format(new Date(date), 'yyyy-MM-dd')
      const fileName = `rapport-visite-${chantier.nomChantier.replace(/\s+/g, '-')}-${dateStr}.pdf`
      
      // Fonction pour télécharger le PDF localement
      const downloadPDF = () => {
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
      
      console.log('Préparation du FormData pour l\'envoi')
      // Créer un objet FormData pour l'upload
      const formData = new FormData()
      formData.append('file', pdfBlob, fileName)
      formData.append('type', 'rapport-visite')
      formData.append('notes', notes)
      
      // Ajouter les métadonnées des personnes présentes
      formData.append('personnesPresentes', JSON.stringify(personnes))
      
      console.log('Envoi du PDF au serveur')
      // Envoyer le PDF au serveur
      try {
        const response = await fetch(`/api/chantiers/${params.chantierId}/documents`, {
          method: 'POST',
          body: formData
        })
        
        console.log('Réponse du serveur:', response.status, response.statusText)
        
        if (!response.ok) {
          const errorData = await response.text()
          console.error('Erreur serveur:', errorData)
          
          // Proposer de télécharger le PDF localement en cas d'erreur
          if (confirm('Impossible d\'enregistrer le rapport sur le serveur. Voulez-vous le télécharger localement ?')) {
            downloadPDF()
          }
          
          throw new Error(`Erreur lors de l'enregistrement du rapport: ${response.status} ${response.statusText}`)
        }
        
        // Rediriger vers la liste des rapports
        router.push(`/chantiers/${params.chantierId}/rapports`)
      } catch (fetchError: any) {
        console.error('Erreur de fetch:', fetchError)
        
        // Proposer de télécharger le PDF localement en cas d'erreur de connexion
        if (confirm('Problème de connexion au serveur. Voulez-vous télécharger le rapport localement ?')) {
          downloadPDF()
        }
        
        setError(`Erreur de connexion: ${fetchError.message}`)
      }
    } catch (error: any) {
      console.error('Erreur générale:', error)
      setError(`Une erreur est survenue lors de la création du rapport: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Suppression du ChantierHeader qui est déjà inclus dans le layout parent */}
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Nouveau rapport de visite - {chantier?.nomChantier}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Créez un rapport détaillé de votre visite sur le chantier.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informations générales</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormInput
                id="date"
                label="Date de la visite"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personnes présentes</h2>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
              <FormInput
                id="nouveauNom"
                label="Nom"
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                placeholder="Nom de la personne"
              />
              <FormInput
                id="nouvelleFonction"
                label="Fonction"
                value={nouvelleFonction}
                onChange={(e) => setNouvelleFonction(e.target.value)}
                placeholder="Fonction / Entreprise"
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddPersonne}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Ajouter
                </button>
              </div>
            </div>
            
            {personnes.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {personnes.map((personne) => (
                  <li key={personne.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{personne.nom}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{personne.fonction}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePersonne(personne.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Aucune personne ajoutée
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notes</h2>
            
            <FormTextarea
              id="notes"
              label="Notes de la visite"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Saisissez vos observations, remarques et points importants..."
              rows={6}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Photos</h2>
            
            <div className="mb-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                <CameraIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                Ajouter des photos
              </button>
            </div>
            
            {photos.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="relative">
                      <img
                        src={photo.preview}
                        alt="Aperçu"
                        className="w-full h-48 object-cover rounded-md mb-2"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <FormTextarea
                      id={`annotation-${photo.id}`}
                      label="Annotation"
                      value={photo.annotation}
                      onChange={(e) => handleAnnotationChange(photo.id, e.target.value)}
                      placeholder="Décrivez cette photo..."
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Aucune photo ajoutée
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Télécharger PDF
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              {saving ? 'Génération en cours...' : 'Générer le rapport'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 