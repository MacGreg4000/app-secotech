'use client'
import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { FormInput, FormTextarea } from '@/components/ui'
import { CameraIcon, XMarkIcon, TagIcon, DocumentDuplicateIcon, ArrowLeftIcon, PlusIcon, TrashIcon, UserGroupIcon, DocumentTextIcon, PhotoIcon, CheckCircleIcon, ExclamationTriangleIcon, CloudArrowUpIcon, WifiIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useNotification } from '@/hooks/useNotification'

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
  tags: string[]
  serverUrl?: string // URL de la photo sur le serveur après upload
}

interface PersonnePresente {
  id: string
  nom: string
  fonction: string
}

interface NoteIndividuelle {
  id: string;
  contenu: string;
  tags: string[];
}

interface RapportData {
  date: string
  notes: string
  notesIndividuelles: NoteIndividuelle[]
  personnes: PersonnePresente[]
  photos: {
    id: string
    preview: string
    annotation: string
    tags: string[]
  }[]
  chantierId: string
}

// Liste des tags disponibles par défaut
const TAGS_PAR_DEFAUT = [
  'Général'
]

// Composant CollapsibleSection spécialement conçu pour cette page
interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  gradientFrom: string
  gradientTo: string
}

function CollapsibleSection({ 
  title, 
  icon, 
  defaultOpen = false, 
  children, 
  gradientFrom, 
  gradientTo 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} px-6 py-4 transition-all duration-200 hover:shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {icon}
            <h2 className="text-xl font-bold text-white ml-3">{title}</h2>
          </div>
          {isOpen ? (
            <ChevronDownIcon className="h-6 w-6 text-white transition-transform duration-200" />
          ) : (
            <ChevronRightIcon className="h-6 w-6 text-white transition-transform duration-200" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

export default function NouveauRapportPage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const searchParams = useSearchParams();
  const editMode = searchParams.get('edit'); // ID du document à éditer
  
  const { data: _session } = useSession()
  const { showNotification, NotificationComponent } = useNotification()
  const router = useRouter()
  const [chantier, setChantier] = useState<ChantierDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)
  
  // État pour suivre si on est en mode édition
  const [isEditing, setIsEditing] = useState(false)
  const [documentId, setDocumentId] = useState<string | null>(null)
  
  // Liste des tags disponibles (état local)
  const [tagsDisponibles, setTagsDisponibles] = useState<string[]>([...TAGS_PAR_DEFAUT])

  // Champs du formulaire
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState<string>('')
  const [notesIndividuelles, setNotesIndividuelles] = useState<NoteIndividuelle[]>([])
  const [photos, setPhotos] = useState<PhotoAnnotee[]>([])
  const [personnes, setPersonnes] = useState<PersonnePresente[]>([])
  
  // Filtre de tags
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('Tous')

  // Champs temporaires pour l'ajout de personnes
  const [nouveauNom, setNouveauNom] = useState<string>('')
  const [nouvelleFonction, setNouvelleFonction] = useState<string>('')
  // Champ temporaire pour l'ajout de tags
  const [nouveauTag, setNouveauTag] = useState<string>('')

  // Champs temporaires pour l'ajout de notes
  const [nouvelleNote, setNouvelleNote] = useState<string>('')
  const [noteTags, setNoteTags] = useState<string[]>(['Général'])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fonction pour uploader les photos en attente (sans serverUrl)
  const uploadPendingPhotos = async () => {
    // Ne pas uploader les photos qui :
    // - ont déjà une serverUrl
    // - ont un fichier vide (placeholder pour photos chargées depuis un rapport existant)
    // - ont un preview qui commence par /uploads/ (déjà sur le serveur)
    const pendingPhotos = photos.filter(p => 
      !p.serverUrl && 
      p.file && 
      p.file.size > 0 && 
      !p.preview.startsWith('/uploads/')
    );
    
    if (pendingPhotos.length === 0) return;
    
    console.log(`📤 Upload de ${pendingPhotos.length} photo(s) en attente...`);
    
    for (const photo of pendingPhotos) {
      try {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('chantierId', params.chantierId);
        formData.append('annotation', photo.annotation || '');
        formData.append('tags', JSON.stringify(photo.tags || ['Général']));
        
        const response = await fetch('/api/rapports/upload-photo', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          setPhotos(prev => prev.map(p => 
            p.id === photo.id 
              ? { ...p, serverUrl: data.url, preview: data.url } 
              : p
          ));
          console.log(`✅ Photo uploadée: ${data.url}`);
        } else {
          const errorData = await response.json();
          console.error('Erreur serveur lors de l\'upload:', errorData);
        }
      } catch (error) {
        console.error('Erreur lors de l\'upload de la photo:', error);
      }
    }
  };

  // Écouter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Uploader les photos en attente quand la connexion revient
      uploadPendingPhotos();
    };
    const handleOffline = () => setIsOffline(true);

    // Vérifier l'état initial
    setIsOffline(!navigator.onLine);

    // Ajouter les écouteurs d'événements
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, params.chantierId]);

  // Sauvegarder le rapport en localStorage à intervalles réguliers
  useEffect(() => {
    // Fonction pour sauvegarder l'état actuel
    const saveToLocalStorage = () => {
      if (!params.chantierId) return;
      
      // Ne pas sauvegarder si on n'a pas commencé à remplir le rapport
      if (date === format(new Date(), 'yyyy-MM-dd') && notesIndividuelles.length === 0 && photos.length === 0 && personnes.length === 0) {
        return;
      }
      
      const photosToSave = photos.map(photo => ({
        id: photo.id,
        preview: photo.preview,
        annotation: photo.annotation,
        tags: photo.tags || []
      }));
      
      const rapportData: RapportData = {
        date,
        notes: '', // Pour compatibilité
        notesIndividuelles,
        personnes,
        photos: photosToSave,
        chantierId: params.chantierId
      };
      
      try {
        localStorage.setItem(`rapport_${params.chantierId}`, JSON.stringify(rapportData));
        setLastSavedTime(new Date());
      } catch (error) {
        console.error('Erreur lors de la sauvegarde locale:', error);
      }
    };
    
    // Sauvegarder toutes les 30 secondes
    const interval = setInterval(saveToLocalStorage, 30000);
    
    // Sauvegarder aussi lors des changements d'onglet ou de fenêtre
    window.addEventListener('beforeunload', saveToLocalStorage);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveToLocalStorage();
      }
    });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', saveToLocalStorage);
      window.removeEventListener('visibilitychange', saveToLocalStorage);
    };
  }, [date, notesIndividuelles, photos, personnes, params.chantierId]);

  // Restaurer les données du rapport depuis le localStorage au chargement
  useEffect(() => {
    if (!params.chantierId) return;
    
    // Si on est en mode édition, ne pas charger les données du localStorage
    // Elles seront chargées depuis le serveur dans un autre useEffect
    if (editMode) {
      setIsEditing(true);
      setDocumentId(editMode);
      return;
    }
    
    try {
      // Vérifier si un formulaire vide a été demandé via l'URL
      const resetRequested = searchParams.get('reset') === 'true';
      if (resetRequested) {
        // Effacer les données et marquer comme soumis pour éviter de les recharger
        localStorage.removeItem(`rapport_${params.chantierId}`);
        localStorage.setItem(`rapport_${params.chantierId}_submitted`, 'true');
        return;
      }
      
      const savedRapport = localStorage.getItem(`rapport_${params.chantierId}`);
      if (savedRapport) {
        const rapportData = JSON.parse(savedRapport);
        
        // Vérifier si le localStorage contient les données d'un rapport en cours de création
        // ou s'il s'agit des données d'un ancien rapport déjà enregistré
        const isNewDraft = !localStorage.getItem(`rapport_${params.chantierId}_submitted`);
        
        // Si c'est un nouveau rapport (pas en mode édition) et qu'on n'a pas de brouillon en cours,
        // on initialise un formulaire vide au lieu de charger les données du localStorage
        if (!isNewDraft) {
          // Supprimer les données de l'ancien rapport pour démarrer avec un formulaire vide
          localStorage.removeItem(`rapport_${params.chantierId}`);
          return;
        }
        
        // Vérifier que les données concernent bien ce chantier
        if (rapportData.chantierId === params.chantierId) {
          setDate(rapportData.date);
          
          // Gérer les anciennes notes (texte simple) vs nouvelles notes (structurées)
          if (rapportData.notesIndividuelles && rapportData.notesIndividuelles.length > 0) {
            setNotesIndividuelles(rapportData.notesIndividuelles);
          } else if (rapportData.notes && typeof rapportData.notes === 'string' && rapportData.notes.trim() !== '') {
            // Convertir l'ancienne note en note individuelle
            setNotesIndividuelles([{
              id: Math.random().toString(36).substring(2, 9),
              contenu: rapportData.notes,
              tags: ['Général']
            }]);
          }
          
          setPersonnes(rapportData.personnes);
          
          // Pour les photos, ne charger que les previews et annotations
          // Les vrais fichiers ne peuvent pas être restaurés du localStorage
          if (rapportData.photos && rapportData.photos.length > 0) {
            const localPhotos: PhotoAnnotee[] = rapportData.photos.map((photo: {
              id: string;
              preview: string;
              annotation: string;
              tags?: string[];
            }) => ({
              id: photo.id,
              file: new File([], "placeholder.jpg"), // Fichier vide comme placeholder
              preview: photo.preview,
              annotation: photo.annotation,
              tags: photo.tags || []
            }));
            setPhotos(localPhotos);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la restauration des données:', error);
    }
  }, [params.chantierId, editMode, searchParams]);

  // Charger les informations du chantier
  useEffect(() => {
    // Fonction pour charger les données du chantier
    const fetchChantier = async () => {
      try {
        // Si mode hors ligne et qu'on a des données en cache, utiliser le cache
        const cachedChantier = localStorage.getItem(`chantier_${params.chantierId}`);
        if (isOffline && cachedChantier) {
          setChantier(JSON.parse(cachedChantier));
          setLoading(false);
          return;
        }
        
        // Sinon, essayer de charger depuis l'API
        const res = await fetch(`/api/chantiers/${params.chantierId}`);
        if (!res.ok) throw new Error('Erreur lors de la récupération du chantier');
        
        const data = await res.json();
        setChantier(data);
        
        // Sauvegarder en cache pour utilisation hors ligne
        localStorage.setItem(`chantier_${params.chantierId}`, JSON.stringify(data));
        
      } catch (error) {
        console.error('Erreur:', error);
        setError('Impossible de charger les informations du chantier');
      } finally {
        setLoading(false);
      }
    };
    
    fetchChantier();
  }, [params.chantierId, isOffline]);

  // Charger les tags personnalisés depuis le localStorage
  useEffect(() => {
    try {
      const savedTags = localStorage.getItem('tags_personnalises');
      if (savedTags) {
        const parsedTags = JSON.parse(savedTags);
        if (Array.isArray(parsedTags) && parsedTags.length > 0) {
          // Filtrer pour supprimer "testag" et autres tags indésirables
          const filteredTags = parsedTags.filter((tag: string) => 
            tag !== 'testag' && tag.trim() !== '' && tag.length > 0 && !TAGS_PAR_DEFAUT.includes(tag)
          );
          setTagsDisponibles([...TAGS_PAR_DEFAUT, ...filteredTags]);
          // Sauvegarder les tags nettoyés si des tags ont été supprimés
          if (filteredTags.length !== parsedTags.length) {
            saveTagsToLocalStorage([...TAGS_PAR_DEFAUT, ...filteredTags]);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tags personnalisés:', error);
    }
  }, []);

  // Sauvegarder les tags personnalisés
  const saveTagsToLocalStorage = (tags: string[]) => {
    try {
      // Sauvegarder uniquement les tags personnalisés (non inclus dans les tags par défaut)
      const customTags = tags.filter(tag => !TAGS_PAR_DEFAUT.includes(tag));
      localStorage.setItem('tags_personnalises', JSON.stringify(customTags));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des tags personnalisés:', error);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      
      // Créer les photos avec preview local temporaire
      const newPhotos = files.map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        preview: URL.createObjectURL(file),
        annotation: '',
        tags: ['Général'],
        serverUrl: '' // URL du serveur après upload
      }))
      
      setPhotos(prev => [...prev, ...newPhotos])
      
      // Uploader les photos sur le serveur si en ligne
      if (!isOffline) {
        for (let i = 0; i < newPhotos.length; i++) {
          const photo = newPhotos[i]
          try {
            const formData = new FormData()
            formData.append('file', photo.file)
            formData.append('chantierId', params.chantierId)
            formData.append('annotation', photo.annotation || '')
            formData.append('tags', JSON.stringify(photo.tags || ['Général']))
            
            const response = await fetch('/api/rapports/upload-photo', {
              method: 'POST',
              body: formData
            })
            
            if (response.ok) {
              const data = await response.json()
              // Mettre à jour la photo avec l'URL du serveur
              setPhotos(prev => prev.map(p => 
                p.id === photo.id 
                  ? { ...p, serverUrl: data.url, preview: data.url } 
                  : p
              ))
              console.log(`✅ Photo uploadée: ${data.url}`)
            }
          } catch (error) {
            console.error('Erreur lors de l\'upload de la photo:', error)
            // Garder l'URL blob en cas d'erreur
          }
        }
      }
      
      // Réinitialiser l'input file pour permettre la sélection du même fichier
      e.target.value = ''
    }
  }

  const handleAnnotationChange = async (id: string, annotation: string) => {
    setPhotos(prev => 
      prev.map(photo => 
        photo.id === id ? { ...photo, annotation } : photo
      )
    )
    
    // Mettre à jour les métadonnées sur le serveur si la photo est déjà uploadée
    const photo = photos.find(p => p.id === id)
    if (photo?.serverUrl && !isOffline) {
      try {
        // On pourrait créer une API de mise à jour, mais pour l'instant
        // les métadonnées seront mises à jour lors de la sauvegarde finale du rapport
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'annotation:', error)
      }
    }
  }

  const _handleTagChange = (id: string, tags: string[]) => {
    setPhotos(prev => 
      prev.map(photo => 
        photo.id === id ? { ...photo, tags } : photo
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

  const handleAddTag = (id: string, tag: string) => {
    setPhotos(prev => 
      prev.map(photo => {
        if (photo.id === id) {
          const currentTags = photo.tags || [];
          // Éviter les doublons
          if (!currentTags.includes(tag)) {
            return { ...photo, tags: [...currentTags, tag] };
          }
        }
        return photo;
      })
    );
  }

  const handleAddGlobalTag = () => {
    if (nouveauTag.trim() === '') return;
    
    // Vérifier si le tag existe déjà dans la liste
    if (!tagsDisponibles.includes(nouveauTag.trim())) {
      // Créer une nouvelle liste avec le nouveau tag
      const newTags = [...tagsDisponibles, nouveauTag.trim()];
      // Mettre à jour l'état
      setTagsDisponibles(newTags);
      // Sauvegarder dans le localStorage
      saveTagsToLocalStorage(newTags);
      // Réinitialiser le champ
      setNouveauTag('');
    }
  }

  const handleRemoveGlobalTag = (tag: string) => {
    // Ne pas supprimer les tags par défaut
    if (TAGS_PAR_DEFAUT.includes(tag)) return;
    
    // Filtrer le tag à supprimer
    const newTags = tagsDisponibles.filter(t => t !== tag);
    // Mettre à jour l'état
    setTagsDisponibles(newTags);
    // Sauvegarder dans le localStorage
    saveTagsToLocalStorage(newTags);
    
    // Si le tag supprimé était celui sélectionné pour le filtre, réinitialiser le filtre
    if (selectedTagFilter === tag) {
      setSelectedTagFilter('Tous');
    }
    
    // Supprimer ce tag de toutes les photos qui l'utilisent
    setPhotos(prev => 
      prev.map(photo => {
        if (photo.tags && photo.tags.includes(tag)) {
          return { ...photo, tags: photo.tags.filter(t => t !== tag) };
        }
        return photo;
      })
    );
  }

  const handleRemoveTag = (id: string, tag: string) => {
    setPhotos(prev => 
      prev.map(photo => {
        if (photo.id === id) {
          const currentTags = photo.tags || [];
          return { ...photo, tags: currentTags.filter(t => t !== tag) };
        }
        return photo;
      })
    );
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

  const handleAddNote = () => {
    if (nouvelleNote.trim() === '') return;
    
    const note: NoteIndividuelle = {
      id: Math.random().toString(36).substring(2, 9),
      contenu: nouvelleNote,
      tags: [...noteTags] // Copier les tags sélectionnés
    };
    
    setNotesIndividuelles(prev => [...prev, note]);
    setNouvelleNote('');
    setNoteTags(['Général']); // Réinitialiser les tags pour la prochaine note
  };
  
  const handleRemoveNote = (id: string) => {
    setNotesIndividuelles(prev => prev.filter(note => note.id !== id));
  };
  
  const handleUpdateNoteContent = (id: string, contenu: string) => {
    setNotesIndividuelles(prev => 
      prev.map(note => note.id === id ? { ...note, contenu } : note)
    );
  };
  
  const handleAddNoteTag = (noteId: string, tag: string) => {
    setNotesIndividuelles(prev => 
      prev.map(note => {
        if (note.id === noteId && !note.tags.includes(tag)) {
          return { ...note, tags: [...note.tags, tag] };
        }
        return note;
      })
    );
  };
  
  const handleRemoveNoteTag = (noteId: string, tag: string) => {
    setNotesIndividuelles(prev => 
      prev.map(note => {
        if (note.id === noteId) {
          return { ...note, tags: note.tags.filter(t => t !== tag) };
        }
        return note;
      })
    );
  };
  
  const handleSelectNoteTag = (tag: string) => {
    if (!noteTags.includes(tag)) {
      setNoteTags(prev => [...prev, tag]);
    } else {
      setNoteTags(prev => prev.filter(t => t !== tag));
    }
  };

  // Fonction pour extraire tous les tags uniques des notes et photos
  const getAllUniqueTags = (): string[] => {
    const tagsSet = new Set<string>()
    
    // Ajouter les tags des notes individuelles
    notesIndividuelles.forEach(note => {
      note.tags.forEach(tag => tagsSet.add(tag))
    })
    
    // Ajouter les tags des photos
    photos.forEach(photo => {
      photo.tags.forEach(tag => tagsSet.add(tag))
    })
    
    return Array.from(tagsSet).filter(tag => tag && tag.trim() !== '')
  }

  const generatePDF = async (tagFilter?: string) => {
    if (!chantier) return null;
    
    // Uploader les photos manquantes avant de générer le PDF
    if (!isOffline) {
      await uploadPendingPhotos();
    }
    
    // Préparer les photos pour le PDF
    const photosForPDF = photos.map(p => ({
      ...p,
      // Utiliser l'URL du serveur si disponible, sinon le preview (pour compatibilité)
      preview: p.serverUrl || p.preview
    }))
    
    console.log(`📸 Envoi de ${photosForPDF.length} photo(s) au générateur PDF`)
    console.log('URLs des photos:', photosForPDF.map(p => p.preview))
    
    // Utiliser l'API Puppeteer moderne
    try {
      const response = await fetch('/api/rapports/generate-pdf-modern', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chantierId: chantier.chantierId,
          date,
          personnes,
          notes: notesIndividuelles,
          photos: photosForPDF,
          tagFilter
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      throw error;
    }
  }

  const handleDownloadPDF = async () => {
    setSaving(true)
    setError(null)
    
    try {
      console.log('Début de la génération du PDF pour téléchargement local')
      // Générer le PDF (sans filtre, rapport complet)
      const pdfBlob = await generatePDF()
      if (!pdfBlob || !chantier) {
        throw new Error('Impossible de générer le PDF')
      }
      
      console.log('PDF généré avec succès')
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
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      setError(`Une erreur est survenue lors de la génération du rapport`)
    } finally {
      setSaving(false)
    }
  }


  // Fonction pour filtrer les photos par tag
  const filteredPhotos = selectedTagFilter === 'Tous' 
    ? photos 
    : photos.filter(photo => photo.tags && photo.tags.includes(selectedTagFilter));

  const clearLocalStorage = () => {
    localStorage.removeItem(`rapport_${params.chantierId}`);
    // Marquer que le rapport a été soumis
    localStorage.setItem(`rapport_${params.chantierId}_submitted`, 'true');
  };

  // Ajouter un nettoyage du localStorage au chargement de la page
  useEffect(() => {
    // Nettoyage automatique au premier chargement
    // Si on arrive sur la page directement (pas en modification) et qu'on n'a pas 
    // explicitement demandé à continuer un brouillon existant
    const continueEdit = searchParams.get('continue') === 'true';
    
    if (!editMode && !continueEdit) {
      localStorage.removeItem(`rapport_${params.chantierId}`);
      localStorage.setItem(`rapport_${params.chantierId}_submitted`, 'true');
    }
    
    // Nettoyage à la fermeture de la page
    return () => {
      // Si le formulaire est vide (aucune modification), marquer comme soumis
      // pour ne pas le restaurer la prochaine fois
      if (personnes.length === 0 && photos.length === 0 && notesIndividuelles.length === 0) {
        localStorage.setItem(`rapport_${params.chantierId}_submitted`, 'true');
      }
    };
  }, [params.chantierId, editMode, searchParams, personnes.length, photos.length, notesIndividuelles.length]);

  // Vérifier si on est en mode édition et charger le document
  useEffect(() => {
    if (editMode) {
      setIsEditing(true);
      setDocumentId(editMode);
      
      // Charger les données du rapport existant
      const fetchDocument = async () => {
        try {
          const res = await fetch(`/api/chantiers/${params.chantierId}/documents/${editMode}`);
          if (!res.ok) throw new Error('Erreur lors de la récupération du document');
          
          const documentData = await res.json();
          console.log('Document chargé:', documentData);
          
          // Restaurer les données de base du rapport
          if (documentData.metadata) {
            // Si on a des métadonnées stockées, les utiliser
            const metadata = documentData.metadata;
            
            if (metadata.date) setDate(metadata.date);
            
            // Gérer les notes
            if (metadata.notesIndividuelles && Array.isArray(metadata.notesIndividuelles)) {
              setNotesIndividuelles(metadata.notesIndividuelles);
            } else if (metadata.notes) {
              // Convertir l'ancienne note en note individuelle
              setNotesIndividuelles([{
                id: Math.random().toString(36).substring(2, 9),
                contenu: metadata.notes,
                tags: ['Général']
              }]);
            }
            
            if (metadata.personnes && Array.isArray(metadata.personnes)) {
              setPersonnes(metadata.personnes);
            }
            if (metadata.tags && Array.isArray(metadata.tags)) {
              // Fusionner les tags par défaut avec les tags sauvegardés
              const uniqueTags = [...new Set([...TAGS_PAR_DEFAUT, ...metadata.tags])];
              setTagsDisponibles(uniqueTags);
            }
            
            // Restaurer les photos (uniquement les previews et annotations)
            if (metadata.photos && Array.isArray(metadata.photos)) {
              try {
                const restoredPhotos = metadata.photos.map((photo: { id?: string; preview: string; annotation?: string; tags?: string[] }) => ({
                  id: photo.id || Math.random().toString(36).substring(2, 9),
                  file: new File([], "placeholder.jpg"), // Fichier vide
                  preview: photo.preview,
                  annotation: photo.annotation || '',
                  tags: photo.tags || ['Général']
                }));
                setPhotos(restoredPhotos);
              } catch (photoError) {
                console.error('Erreur lors de la restauration des photos:', photoError);
              }
            }
          } else {
            // Si pas de métadonnées, extraire ce qu'on peut du nom du document
            const filename = documentData.nom;
            // Exemple: rapport-visite-NomChantier-2023-04-15.pdf
            // Essayer d'extraire la date
            const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch && dateMatch[1]) {
              setDate(dateMatch[1]);
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement du document à éditer:', error);
          setError('Impossible de charger le rapport à éditer');
        }
      };
      
      fetchDocument();
    }
  }, [editMode, params.chantierId]);

  // Sauvegarder les métadonnées du rapport
  const saveRapportMetadata = async (docId: number) => {
    try {
      const metadata = {
        date,
        notesIndividuelles,
        personnes,
        photos: photos.map(photo => ({
          id: photo.id,
          preview: photo.preview,
          annotation: photo.annotation,
          tags: photo.tags || []
        })),
        tags: tagsDisponibles
      };
      
      // Envoyer les métadonnées au serveur via l'API PUT
      const response = await fetch(`/api/chantiers/${params.chantierId}/documents/${docId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metadata
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde des métadonnées');
      }
      
      console.log('Métadonnées du rapport sauvegardées dans la base de données');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des métadonnées:', error);
    }
  };

  // Fonction pour mettre à jour un rapport existant
  const updateExistingReport = async () => {
    if (!documentId || !chantier) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Récupérer les informations du document existant pour connaître son nom de fichier
      const docResponse = await fetch(`/api/chantiers/${params.chantierId}/documents/${documentId}`);
      if (!docResponse.ok) {
        throw new Error('Impossible de récupérer les informations du document existant');
      }
      const existingDoc = await docResponse.json();
      
      // Parser les métadonnées si c'est une string JSON
      let parsedMetadata = existingDoc.metadata
      if (typeof parsedMetadata === 'string') {
        try {
          parsedMetadata = JSON.parse(parsedMetadata)
        } catch (e) {
          console.warn('Erreur lors du parsing des métadonnées:', e)
          parsedMetadata = null
        }
      }
      
      // Récupérer les IDs des variantes filtrées si elles existent
      const rapportVariantesIds: number[] = parsedMetadata?.rapportVariantesIds || []
      
      // Supprimer les anciens documents (principal + variantes)
      const idsToDelete = [parseInt(documentId), ...rapportVariantesIds]
      for (const id of idsToDelete) {
        try {
          await fetch(`/api/chantiers/${params.chantierId}/documents/${id}`, {
            method: 'DELETE'
          })
        } catch (error) {
          console.warn(`Impossible de supprimer le document ${id}:`, error)
        }
      }
      
      // Générer le PDF général
      const pdfBlob = await generatePDF();
      if (!pdfBlob) {
        throw new Error('Impossible de générer le PDF');
      }
      console.log('Taille du PDF généré:', Math.round(pdfBlob.size / 1024), 'KB');
      
      // Extraire tous les tags uniques
      const allTags = getAllUniqueTags()
      console.log('📋 Tags uniques trouvés pour la mise à jour:', allTags)
      
      const dateStr = format(new Date(date), 'yyyy-MM-dd');
      const fileName = `rapport-visite-${chantier.nomChantier.replace(/\s+/g, '-')}-${dateStr}.pdf`;
      
      // Créer le rapport général
      const formData = new FormData();
      formData.append('file', pdfBlob, fileName);
      formData.append('type', 'rapport-visite-general');
      formData.append('notes', notes);
      formData.append('personnesPresentes', JSON.stringify(personnes));
      formData.append('tags', JSON.stringify(Array.from(tagsDisponibles)));
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/documents`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de l'enregistrement du rapport: ${response.status}`);
      }
      
      const newDocument = await response.json();
      const rapportGeneralId = newDocument.id
      
      // Sauvegarder les métadonnées du nouveau rapport
      await saveRapportMetadata(rapportGeneralId);
      
      // Générer et sauvegarder un PDF pour chaque tag unique
      const nouvellesVariantesIds: number[] = []
      for (const tag of allTags) {
        try {
          console.log(`📄 Génération du PDF filtré pour le tag: ${tag}`)
          const pdfBlobFiltre = await generatePDF(tag)
          
          if (pdfBlobFiltre) {
            const formDataFiltre = new FormData()
            const safeTag = tag.replace(/\s+/g, '-')
            const fileNameFiltre = `rapport-visite-${safeTag}-${chantier.nomChantier.replace(/\s+/g, '-')}-${dateStr}.pdf`
            formDataFiltre.append('file', pdfBlobFiltre, fileNameFiltre)
            formDataFiltre.append('type', `rapport-visite-tag-${safeTag}`)
            
            const metadataFiltre = {
              rapportPrincipalId: rapportGeneralId,
              tag: tag,
              date: dateStr
            }
            formDataFiltre.append('metadata', JSON.stringify(metadataFiltre))
            
            const responseFiltre = await fetch(`/api/chantiers/${params.chantierId}/documents`, {
              method: 'POST',
              body: formDataFiltre
            })
            
            if (responseFiltre.ok) {
              const dataFiltre = await responseFiltre.json()
              nouvellesVariantesIds.push(dataFiltre.id)
              console.log(`✅ PDF filtré pour "${tag}" sauvegardé avec succès`)
            }
          }
        } catch (error) {
          console.error(`❌ Erreur lors de la génération du PDF filtré pour "${tag}":`, error)
        }
      }
      
      // Mettre à jour les métadonnées du rapport principal
      if (nouvellesVariantesIds.length > 0) {
        try {
          await fetch(`/api/chantiers/${params.chantierId}/documents/${rapportGeneralId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                rapportVariantesIds: nouvellesVariantesIds,
                tagsGeneres: allTags
              }
            })
          })
        } catch (error) {
          console.error('Erreur lors de la mise à jour des métadonnées:', error)
        }
      }
      
      // Rediriger vers la liste des rapports avec un paramètre pour forcer le rafraîchissement
      router.push(`/chantiers/${params.chantierId}/rapports?refresh=${Date.now()}`);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rapport:', error);
      setError('Une erreur est survenue lors de la mise à jour du rapport');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)

      if (isOffline) {
        // Mode hors ligne
        await handleDownloadPDF()
        showNotification('Information', "Le PDF a été généré en mode hors ligne. Vous pourrez l'envoyer au serveur une fois la connexion rétablie.", 'info')
        return
      }

      // Générer le PDF général (sans filtre)
      const pdfBlob = await generatePDF()
      if (!pdfBlob || !chantier) {
        throw new Error("Échec de la génération du PDF")
      }

      // Si nous sommes en mode édition, mettre à jour le rapport existant
      if (isEditing && documentId) {
        await updateExistingReport()
        return
      }

      // Extraire tous les tags uniques des notes et photos
      const allTags = getAllUniqueTags()
      console.log('📋 Tags uniques trouvés:', allTags)

      // Créer un objet FormData pour l'upload du rapport général
      const formData = new FormData()
      const dateStr = format(new Date(date), 'yyyy-MM-dd')
      const fileName = `rapport-visite-${chantier.nomChantier.replace(/\s+/g, '-')}-${dateStr}.pdf`
      formData.append('file', pdfBlob, fileName)
      formData.append('type', 'rapport-visite-general')

      // Ajouter les personnes présentes et les tags aux données
      formData.append('personnesPresentes', JSON.stringify(personnes))
      formData.append('tags', JSON.stringify(Array.from(tagsDisponibles)))
      formData.append('notes', notes)

      // Envoyer le rapport général au serveur
      const response = await fetch(`/api/chantiers/${params.chantierId}/documents`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error("Échec de l'envoi du rapport")
      }

      const responseData = await response.json()
      console.log("Rapport général envoyé avec succès:", responseData)
      const rapportGeneralId = responseData.id

      // Sauvegarde des métadonnées du rapport général dans la base de données
      if (rapportGeneralId) {
        await saveRapportMetadata(rapportGeneralId)
      }

      // Générer et sauvegarder un PDF pour chaque tag unique
      const rapportVariantesIds: number[] = []
      for (const tag of allTags) {
        try {
          console.log(`📄 Génération du PDF filtré pour le tag: ${tag}`)
          const pdfBlobFiltre = await generatePDF(tag)
          
          if (pdfBlobFiltre) {
            const formDataFiltre = new FormData()
            const safeTag = tag.replace(/\s+/g, '-')
            const fileNameFiltre = `rapport-visite-${safeTag}-${chantier.nomChantier.replace(/\s+/g, '-')}-${dateStr}.pdf`
            formDataFiltre.append('file', pdfBlobFiltre, fileNameFiltre)
            formDataFiltre.append('type', `rapport-visite-tag-${safeTag}`)
            
            // Ajouter les métadonnées pour lier au rapport principal
            const metadataFiltre = {
              rapportPrincipalId: rapportGeneralId,
              tag: tag,
              date: dateStr
            }
            formDataFiltre.append('metadata', JSON.stringify(metadataFiltre))
            
            const responseFiltre = await fetch(`/api/chantiers/${params.chantierId}/documents`, {
              method: 'POST',
              body: formDataFiltre
            })
            
            if (responseFiltre.ok) {
              const dataFiltre = await responseFiltre.json()
              rapportVariantesIds.push(dataFiltre.id)
              console.log(`✅ PDF filtré pour "${tag}" sauvegardé avec succès`)
            } else {
              console.warn(`⚠️ Échec de la sauvegarde du PDF filtré pour "${tag}"`)
            }
          }
        } catch (error) {
          console.error(`❌ Erreur lors de la génération du PDF filtré pour "${tag}":`, error)
          // Continuer avec les autres tags même si un échoue
        }
      }

      // Mettre à jour les métadonnées du rapport général pour inclure les IDs des variantes
      if (rapportGeneralId && rapportVariantesIds.length > 0) {
        try {
          await fetch(`/api/chantiers/${params.chantierId}/documents/${rapportGeneralId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metadata: {
                rapportVariantesIds,
                tagsGeneres: allTags
              }
            })
          })
        } catch (error) {
          console.error('Erreur lors de la mise à jour des métadonnées du rapport principal:', error)
        }
      }

      // Ajouter les photos comme documents séparés seulement si elles ont des annotations ou des tags
      for (const photo of photos) {
        if (photo.annotation || (photo.tags && photo.tags.length > 0 && !photo.tags.includes('Général'))) {
          try {
            // Créer un blob à partir du preview de l'image
            const response = await fetch(photo.preview)
            const photoBlob = await response.blob()
            
            // Créer un nom de fichier basé sur l'annotation ou un nom par défaut
            const photoName = photo.annotation 
              ? `${photo.annotation.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.jpg` 
              : `photo-chantier-${new Date().toISOString()}-${photo.id.substring(0, 8)}.jpg`
            
            // Créer un fichier à partir du blob
            const photoFile = new File([photoBlob], photoName, { type: 'image/jpeg' })
            
            // Créer un FormData pour l'upload
            const photoFormData = new FormData()
            photoFormData.append('file', photoFile)
            photoFormData.append('type', 'photo-chantier')
            
            // Ajouter l'annotation et les tags comme metadata
            const metadata = {
              annotation: photo.annotation || '',
              tags: photo.tags.filter(tag => tag !== 'Général') || []
            }
            photoFormData.append('metadata', JSON.stringify(metadata))
            
            // Envoyer la photo au serveur
            const photoResponse = await fetch(`/api/chantiers/${params.chantierId}/documents`, {
              method: 'POST',
              body: photoFormData
            })
            
            if (photoResponse.ok) {
              console.log("Photo ajoutée comme document:", photoName)
            } else {
              console.warn("Échec de l'ajout de la photo comme document:", photoName)
            }
          } catch (photoError) {
            console.error("Erreur lors de l'ajout de la photo comme document:", photoError)
            // Continuer avec les autres photos même si une échoue
          }
        }
      }

      // Afficher un message de succès et rediriger
      toast.success('Rapport enregistré avec succès !', {
        duration: 4000,
        icon: '✅'
      })
      clearLocalStorage()
      router.push(`/chantiers/${params.chantierId}/rapports?refresh=${Date.now()}`)
    } catch (error) {
      console.error("Erreur lors de l'envoi du rapport:", error)
      toast.error("Erreur lors de l'envoi du rapport. Veuillez réessayer.", {
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }

  // Fonction pour effacer complètement le formulaire et le localStorage
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resetForm = () => {
    // Effacer le localStorage
    localStorage.removeItem(`rapport_${params.chantierId}`);
    localStorage.setItem(`rapport_${params.chantierId}_submitted`, 'true');
    
    // Réinitialiser tous les états du formulaire
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    setNotesIndividuelles([]);
    setPhotos([]);
    setPersonnes([]);
    
    // Libérer la mémoire des URL des photos
    photos.forEach(photo => {
      URL.revokeObjectURL(photo.preview);
    });
    
    showNotification('Succès', "Le formulaire a été réinitialisé.", 'success')
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="relative rounded-2xl shadow-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800" />
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/chantiers/${params.chantierId}/rapports`}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/40 bg-white/20 backdrop-blur-sm text-white shadow-sm hover:bg-white/30 transition"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">Retour</span>
                  </Link>

                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30 text-white">
                    <DocumentTextIcon className="h-5 w-5 mr-3" />
                    <span className="text-base sm:text-lg font-bold">
                      {isEditing ? 'Modifier un rapport de visite' : 'Nouveau rapport de visite'}
                    </span>
                  </div>

                  {chantier?.nomChantier && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/25 text-white border border-white/40 rounded-full text-xs font-semibold shadow-sm">
                      Chantier · {chantier.nomChantier}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/90">
                  <span className="inline-flex items-center gap-2">
                    <span className="opacity-90">Date du rapport</span>
                    <span className="font-semibold">
                      {new Date(date).toLocaleDateString('fr-FR')}
                    </span>
                  </span>
                  {isEditing && documentId && (
                    <span className="inline-flex items-center gap-2">
                      <span className="opacity-90">Mode</span>
                      <span className="font-semibold">Édition</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-3">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {isOffline ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-white rounded-full text-sm font-semibold">
                      <WifiIcon className="h-4 w-4" />
                      Hors ligne
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-white rounded-full text-sm font-semibold">
                      <WifiIcon className="h-4 w-4" />
                      En ligne
                    </span>
                  )}

                  {lastSavedTime && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-white rounded-full text-xs font-semibold">
                      Sauvegarde auto · {lastSavedTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-white/80">
                  <span className="inline-flex items-center gap-2">
                    <CloudArrowUpIcon className="h-4 w-4" />
                    Sauvegarde locale toutes les 30s
                  </span>
                  {isOffline && (
                    <span className="inline-flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Les PDF seront disponibles en local
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement du chantier...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Erreur</h3>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section Informations générales */}
            <CollapsibleSection
              title="Informations générales"
              icon={<DocumentTextIcon className="h-6 w-6 text-white" />}
              defaultOpen={true}
              gradientFrom="from-slate-600"
              gradientTo="to-slate-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  id="date"
                  label="Date de la visite"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearLocalStorage}
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Réinitialiser le formulaire
                  </button>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section Personnes présentes */}
            <CollapsibleSection
              title="Personnes présentes"
              icon={<UserGroupIcon className="h-6 w-6 text-white" />}
              defaultOpen={false}
              gradientFrom="from-slate-600"
              gradientTo="to-slate-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  id="nouveauNom"
                  label="Nom"
                  value={nouveauNom}
                  onChange={(e) => setNouveauNom(e.target.value)}
                  placeholder="Nom de la personne"
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                <FormInput
                  id="nouvelleFonction"
                  label="Fonction"
                  value={nouvelleFonction}
                  onChange={(e) => setNouvelleFonction(e.target.value)}
                  placeholder="Fonction/Rôle"
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddPersonne}
                    disabled={!nouveauNom.trim()}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter
                  </button>
                </div>
              </div>
              
              {personnes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personnes.map(personne => (
                    <div key={personne.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{personne.nom}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{personne.fonction}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePersonne(personne.id)}
                          className="ml-2 p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Section Gestion des tags */}
            <CollapsibleSection
              title="Gestion des tags"
              icon={<TagIcon className="h-6 w-6 text-white" />}
              defaultOpen={false}
              gradientFrom="from-slate-600"
              gradientTo="to-slate-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  id="nouveauTag"
                  label="Nouveau tag"
                  value={nouveauTag}
                  onChange={(e) => setNouveauTag(e.target.value)}
                  placeholder="Nom du tag"
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddGlobalTag}
                    disabled={!nouveauTag.trim()}
                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Ajouter un tag
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tags disponibles
                </label>
                <div className="flex flex-wrap gap-2">
                  {tagsDisponibles.map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700"
                    >
                      {tag}
                      {!TAGS_PAR_DEFAUT.includes(tag) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGlobalTag(tag)}
                          className="ml-2 p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-100"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Note: Les tags par défaut ne peuvent pas être supprimés.
                </p>
              </div>

            </CollapsibleSection>

            {/* Section Notes */}
            <CollapsibleSection
              title="Notes et observations"
              icon={<DocumentTextIcon className="h-6 w-6 text-white" />}
              defaultOpen={false}
              gradientFrom="from-slate-600"
              gradientTo="to-slate-700"
            >
              <div className="space-y-4">
                <FormTextarea
                  id="nouvelleNote"
                  label="Nouvelle note"
                  value={nouvelleNote}
                  onChange={(e) => setNouvelleNote(e.target.value)}
                  placeholder="Saisissez une nouvelle observation ou remarque..."
                  rows={3}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags pour cette note
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tagsDisponibles.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSelectNoteTag(tag)}
                        className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${noteTags.includes(tag) 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!nouvelleNote.trim()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Ajouter la note
                </button>
              </div>
              
              {notesIndividuelles.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notes ajoutées</h3>
                  {notesIndividuelles.map((note, index) => (
                    <div key={note.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">Note {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveNote(note.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <FormTextarea
                        value={note.contenu}
                        onChange={(e) => handleUpdateNoteContent(note.id, e.target.value)}
                        rows={3}
                        className="mb-3 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                      />
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Tags:
                        </span>
                        {note.tags.map(tag => (
                          <span 
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveNoteTag(note.id, tag)}
                              className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddNoteTag(note.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="text-xs border-gray-300 rounded-md py-1 pl-2 pr-6 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">+ Ajouter tag</option>
                          {tagsDisponibles.filter(tag => 
                            !note.tags.includes(tag)
                          ).map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Section Photos */}
            <CollapsibleSection
              title="Photos du chantier"
              icon={<PhotoIcon className="h-6 w-6 text-white" />}
              defaultOpen={false}
              gradientFrom="from-slate-600"
              gradientTo="to-slate-700"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <TagIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrer par tag:</span>
                </div>
                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-3 pr-10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="Tous">Tous les tags</option>
                  {tagsDisponibles.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                >
                  <CameraIcon className="h-6 w-6 mr-2" />
                  Sélectionner des photos
                </button>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Glissez-déposez des images ici ou cliquez pour sélectionner
                </p>
              </div>
              
              {filteredPhotos.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPhotos.map((photo) => (
                    <div key={photo.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      <div className="relative">
                        <img 
                          src={photo.preview} 
                          alt="Photo du chantier" 
                          className="w-full h-48 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-full shadow-lg transition-all duration-200 group-hover:opacity-100 opacity-75 hover:opacity-100"
                          title="Supprimer cette photo"
                        >
                          <TrashIcon className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        <FormTextarea
                          value={photo.annotation}
                          onChange={(e) => handleAnnotationChange(photo.id, e.target.value)}
                          placeholder="Annotation de la photo..."
                          rows={2}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tags
                          </label>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {photo.tags && photo.tags.map(tag => (
                              <span 
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(photo.id, tag)}
                                  className="ml-1 text-cyan-600 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-100"
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddTag(photo.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md py-1 pl-2 pr-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="">+ Ajouter un tag</option>
                            {tagsDisponibles.filter(tag => 
                              !photo.tags || !photo.tags.includes(tag)
                            ).map(tag => (
                              <option key={tag} value={tag}>{tag}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <PhotoIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {selectedTagFilter === 'Tous' 
                      ? 'Aucune photo ajoutée pour le moment' 
                      : `Aucune photo avec le tag "${selectedTagFilter}"`
                    }
                  </p>
                </div>
              )}
            </CollapsibleSection>

            {/* Actions finales */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={saving}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                    Prévisualiser PDF
                  </button>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    type="submit"
                    disabled={saving || isOffline}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center shadow-lg"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                        {isEditing ? 'Mettre à jour le rapport' : 'Enregistrer le rapport'}
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {isOffline && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Mode hors ligne activé
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Votre rapport sera sauvegardé localement et synchronisé automatiquement lorsque vous serez de nouveau en ligne.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
      <NotificationComponent />
    </div>
  )
} 