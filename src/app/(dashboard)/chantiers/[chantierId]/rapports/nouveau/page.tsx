'use client'
import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FormInput, FormTextarea, FormSelect } from '@/components/ui'
import { CameraIcon, UserIcon, XMarkIcon, DocumentArrowDownIcon, TagIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline'

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

export default function NouveauRapportPage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const searchParams = useSearchParams();
  const editMode = searchParams.get('edit'); // ID du document à éditer
  
  const { data: session } = useSession()
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
  // Tag sélectionné pour l'export d'un rapport filtré
  const [exportTagFilter, setExportTagFilter] = useState<string>('Tous')

  // Champs temporaires pour l'ajout de personnes
  const [nouveauNom, setNouveauNom] = useState<string>('')
  const [nouvelleFonction, setNouvelleFonction] = useState<string>('')
  // Champ temporaire pour l'ajout de tags
  const [nouveauTag, setNouveauTag] = useState<string>('')

  // Champs temporaires pour l'ajout de notes
  const [nouvelleNote, setNouvelleNote] = useState<string>('')
  const [noteTags, setNoteTags] = useState<string[]>(['Général'])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Écouter les changements de connectivité
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
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
  }, []);

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
          setTagsDisponibles([...TAGS_PAR_DEFAUT, ...parsedTags.filter(tag => !TAGS_PAR_DEFAUT.includes(tag))]);
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        preview: URL.createObjectURL(file),
        annotation: '',
        tags: ['Général']
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

  const handleTagChange = (id: string, tags: string[]) => {
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

  const generatePDF = async (tagFilter?: string) => {
    if (!chantier) return null;
    
    // Orientation portrait pour le rapport, format A4
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Générer la page de garde
    // Logo et titre
    doc.setFontSize(22);
    doc.text('RAPPORT DE VISITE DE CHANTIER', 105, 50, { align: 'center' });
    
    // Informations du chantier
    doc.setFontSize(16);
    doc.text(`Chantier: ${chantier.nomChantier}`, 105, 70, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Client: ${chantier.clientNom || 'Non spécifié'}`, 105, 80, { align: 'center' });
    doc.text(`Date de la visite: ${format(new Date(date), 'PP', { locale: fr })}`, 105, 90, { align: 'center' });
    
    if (tagFilter && tagFilter !== 'Tous') {
      doc.setFontSize(12);
      doc.text(`Rapport filtré: ${tagFilter}`, 105, 100, { align: 'center' });
    }
    
    // Adresse du chantier
    if (chantier.adresseChantier) {
      doc.setFontSize(12);
      doc.text(`Adresse: ${chantier.adresseChantier}`, 105, 110, { align: 'center' });
    }
    
    // Personnes présentes (sur la première page plutôt que d'ajouter une nouvelle page)
    if (personnes.length > 0) {
      let yPos = 130;
      
      doc.setFontSize(14);
      doc.text('Personnes présentes:', 105, yPos, { align: 'center' });
      yPos += 10;
      
      doc.setFontSize(11);
      personnes.forEach(personne => {
        doc.text(`• ${personne.nom} - ${personne.fonction}`, 60, yPos);
        yPos += 7;
        
        // Si on atteint le bas de la page, passer à une nouvelle page
        if (yPos > 270 && personnes.indexOf(personne) < personnes.length - 1) {
          doc.addPage();
          yPos = 20;
        }
      });
    }
    
    // Notes - Filtrer selon le tagFilter si spécifié
    const notesToInclude = tagFilter && tagFilter !== 'Tous'
      ? notesIndividuelles.filter(note => note.tags.includes(tagFilter))
      : notesIndividuelles;
      
    if (notesToInclude.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Notes', 105, 20, { align: 'center' });
      
      let yPos = 40;
      doc.setFontSize(12);
      
      notesToInclude.forEach((note, index) => {
        // Afficher le numéro et les tags de la note
        doc.setFontSize(12);
        doc.setFont("helvetica", 'bold');
        doc.text(`Note ${index + 1}:`, 20, yPos);
        yPos += 6;
        
        // Afficher les tags
        if (note.tags.length > 0) {
          doc.setFontSize(10);
          doc.setFont("helvetica", 'italic');
          doc.text(`Tags: ${note.tags.join(', ')}`, 20, yPos);
          yPos += 6;
        }
        
        // Afficher le contenu de la note
        doc.setFontSize(11);
        doc.setFont("helvetica", 'normal');
        const splitContent = doc.splitTextToSize(note.contenu, 170);
        doc.text(splitContent, 20, yPos);
        yPos += splitContent.length * 6 + 10; // Ajouter de l'espace entre les notes
        
        // Si la position Y est trop basse, ajouter une nouvelle page
        if (yPos > 270 && index < notesToInclude.length - 1) {
          doc.addPage();
          yPos = 20;
        }
      });
    }
    
    // Photos
    // Filtrer les photos si un tag est spécifié
    const photosToInclude = tagFilter && tagFilter !== 'Tous'
      ? photos.filter(photo => photo.tags && photo.tags.includes(tagFilter))
      : photos;
    
    if (photosToInclude.length > 0) {
      // Limiter le nombre de photos pour éviter un PDF trop volumineux
      const maxPhotos = 20;
      const limitedPhotos = photosToInclude.slice(0, maxPhotos);
      
      for (let i = 0; i < limitedPhotos.length; i++) {
        const photo = limitedPhotos[i];
        
        // Ajouter une nouvelle page pour chaque photo
        doc.addPage();
        
        try {
          // Méthode directe: utiliser directement le fichier image original
          // Créer un FileReader pour lire le fichier en tant que URL de données
          let imgData: string;
          
          // Si la photo a un fichier réel, l'utiliser
          if (photo.file && photo.file.size > 0) {
            const reader = new FileReader();
            
            // Attendre que le fichier soit lu
            imgData = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(photo.file);
            });
          } else {
            // Sinon, utiliser directement la preview (qui peut être une URL ou une donnée base64)
            imgData = photo.preview as string;
            
            // Si c'est une URL et non du base64, on utilise un canvas pour la convertir
            if (typeof imgData === 'string' && !imgData.startsWith('data:image/')) {
              try {
                console.log('Conversion de l\'URL en base64:', imgData);
                
                // Créer un canvas temporaire pour convertir l'image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                // Utiliser une promesse pour attendre le chargement de l'image
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => {
                    // Définir les dimensions du canvas
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Dessiner l'image sur le canvas
                    ctx?.drawImage(img, 0, 0);
                    resolve();
                  };
                  img.onerror = () => {
                    reject(new Error('Impossible de charger l\'image depuis l\'URL'));
                  };
                  
                  // Pour les images sur notre serveur
                  if (imgData.startsWith('/')) {
                    img.src = window.location.origin + imgData;
                  } else {
                    img.crossOrigin = 'anonymous';
                    img.src = imgData;
                  }
                });
                
                // Convertir le canvas en base64
                const dataUrl = canvas.toDataURL('image/jpeg');
                imgData = dataUrl;
              } catch (error) {
                console.error('Erreur lors de la conversion de l\'image:', error);
                
                // Créer une image de remplacement avec un message d'erreur
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 400;
                canvas.height = 300;
                
                if (ctx) {
                  ctx.fillStyle = '#f8f9fa';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.fillStyle = '#dc3545';
                  ctx.font = '20px Arial';
                  ctx.fillText('Image non disponible', 100, 150);
                }
                
                imgData = canvas.toDataURL('image/jpeg');
              }
            }
          }
          
          // Charger l'image pour obtenir ses dimensions
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => {
              console.error('Erreur lors du chargement de l\'image:', e);
              reject(new Error('Impossible de charger l\'image'));
            };
            img.src = imgData;
          });
          
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
          
          // Ajouter un titre pour la photo avec les tags
          doc.setFontSize(14)
          doc.text(`Photo ${i + 1}`, pageWidth / 2, 20, { align: 'center' })
          
          // Ajouter les tags de la photo
          if (photo.tags && photo.tags.length > 0) {
            doc.setFontSize(10)
            doc.text(`Tags: ${photo.tags.join(', ')}`, pageWidth / 2, 30, { align: 'center' })
          }
          
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
          // Ajouter une page avec un message d'erreur pour cette photo
          doc.addPage()
          doc.setFontSize(14)
          doc.text(`Photo ${i + 1} - Erreur de chargement`, 105, 20, { align: 'center' })
          doc.setFontSize(11)
          doc.text(`L'image n'a pas pu être ajoutée au PDF en raison d'une erreur.`, 20, 40)
          
          // Ajouter tout de même l'annotation si présente
          if (photo.annotation) {
            doc.setFontSize(11)
            doc.text('Annotation de la photo:', 20, 60)
            const splitAnnotation = doc.splitTextToSize(photo.annotation, 170)
            doc.text(splitAnnotation, 20, 70)
          }
          
          // Ajouter les tags si présents
          if (photo.tags && photo.tags.length > 0) {
            doc.setFontSize(10)
            doc.text(`Tags: ${photo.tags.join(', ')}`, 20, 50)
          }
          
          // Continuer avec les autres photos
        }
      }
      
      // Si on a limité le nombre d'images, ajouter une note
      if (photosToInclude.length > maxPhotos) {
        doc.addPage()
        doc.setFontSize(12)
        doc.text(`Note: ${photosToInclude.length - maxPhotos} autres photos n'ont pas été incluses dans ce PDF.`, 20, 30)
      }
    } else if (tagFilter && tagFilter !== 'Tous') {
      // Si aucune photo pour ce tag
      doc.addPage()
      doc.setFontSize(12)
      doc.text(`Aucune photo n'a été trouvée avec le tag "${tagFilter}".`, 20, 30)
    }
    
    // Ajouter le pied de page
    const totalPages = doc.internal.pages.length - 1
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(10)
      const piedPage = tagFilter && tagFilter !== 'Tous'
        ? `Rapport filtré (${tagFilter}) généré le ${format(new Date(), 'PPP', { locale: fr })} par ${session?.user?.name || 'Utilisateur'}`
        : `Rapport généré le ${format(new Date(), 'PPP', { locale: fr })} par ${session?.user?.name || 'Utilisateur'}`;
      doc.text(
        piedPage,
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
      // Générer le PDF (sans filtre, rapport complet)
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
      
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      setError(`Une erreur est survenue lors de la génération du rapport: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadFilteredPDF = async () => {
    if (exportTagFilter === 'Tous') {
      return handleDownloadPDF();
    }
    
    setSaving(true)
    setError(null)
    
    try {
      console.log(`Début de la génération du PDF filtré pour: ${exportTagFilter}`)
      // Générer le PDF avec le filtre sélectionné
      const doc = await generatePDF(exportTagFilter)
      if (!doc || !chantier) {
        throw new Error('Impossible de générer le PDF')
      }
      
      console.log('PDF filtré généré avec succès')
      
      // Convertir le PDF en Blob
      const pdfBlob = doc.output('blob')
      console.log('Taille du PDF généré:', Math.round(pdfBlob.size / 1024), 'KB')
      
      // Créer un nom de fichier pour le PDF incluant le tag
      const dateStr = format(new Date(date), 'yyyy-MM-dd')
      const safeTag = exportTagFilter.replace(/\s+/g, '-');
      const fileName = `rapport-${safeTag}-${chantier.nomChantier.replace(/\s+/g, '-')}-${dateStr}.pdf`
      
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
      console.error('Erreur lors de la génération du PDF filtré:', error)
      setError(`Une erreur est survenue lors de la génération du rapport filtré: ${error.message}`)
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
                const restoredPhotos = metadata.photos.map((photo: any) => ({
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
      
      // Générer un nouveau PDF
      const doc = await generatePDF();
      if (!doc) {
        throw new Error('Impossible de générer le PDF');
      }
      
      // Convertir le PDF en Blob
      const pdfBlob = doc.output('blob');
      console.log('Taille du PDF généré:', Math.round(pdfBlob.size / 1024), 'KB');
      
      // Utiliser le même nom de fichier que le document existant
      const fileName = existingDoc.nom;
      
      // Créer un objet FormData pour l'upload
      const formData = new FormData();
      formData.append('file', pdfBlob, fileName);
      formData.append('type', 'rapport-visite');
      formData.append('notes', notes);
      
      // Supprimer l'ancien document
      const deleteResponse = await fetch(`/api/chantiers/${params.chantierId}/documents/${documentId}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        console.warn('Impossible de supprimer l\'ancien document, création d\'une nouvelle version');
      }
      
      // Envoyer le PDF mis à jour au serveur
      const response = await fetch(`/api/chantiers/${params.chantierId}/documents`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de l'enregistrement du rapport: ${response.status}`);
      }
      
      const newDocument = await response.json();
      
      // Sauvegarder les métadonnées du nouveau rapport
      await saveRapportMetadata(newDocument.id);
      
      // Rediriger vers la liste des rapports
      router.push(`/chantiers/${params.chantierId}/rapports`);
      
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du rapport:', error);
      setError(`Une erreur est survenue lors de la mise à jour du rapport: ${error.message}`);
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
        alert("Le PDF a été généré en mode hors ligne. Vous pourrez l'envoyer au serveur une fois la connexion rétablie.")
        return
      }

      // Générer le PDF
      const doc = await generatePDF()
      if (!doc || !chantier) {
        throw new Error("Échec de la génération du PDF")
      }
      
      // Convertir en blob
      const pdfBlob = doc.output('blob')

      // Si nous sommes en mode édition, mettre à jour le rapport existant
      if (isEditing && documentId) {
        await updateExistingReport()
        return
      }

      // Créer un objet FormData pour l'upload
      const formData = new FormData()
      const dateStr = format(new Date(date), 'yyyy-MM-dd')
      const fileName = `rapport-visite-${chantier.nomChantier.replace(/\s+/g, '-')}-${dateStr}.pdf`
      formData.append('file', pdfBlob, fileName)
      formData.append('type', 'rapport-visite')

      // Ajouter les personnes présentes et les tags aux données
      formData.append('personnesPresentes', JSON.stringify(personnes))
      formData.append('tags', JSON.stringify(Array.from(tagsDisponibles)))
      formData.append('notes', notes)

      // Envoyer le rapport au serveur
      const response = await fetch(`/api/chantiers/${params.chantierId}/documents`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error("Échec de l'envoi du rapport")
      }

      const responseData = await response.json()
      console.log("Rapport envoyé avec succès:", responseData)

      // Sauvegarde des métadonnées du rapport dans la base de données
      if (responseData && responseData.id) {
        await saveRapportMetadata(responseData.id)
      }

      // Également ajouter chaque photo comme document distinct de type "photo-chantier"
      for (const photo of photos) {
        try {
          // Créer un blob à partir du preview de l'image
          const response = await fetch(photo.preview)
          const photoBlob = await response.blob()
          
          // Créer un nom de fichier basé sur l'annotation (si elle existe) ou un nom par défaut
          const photoName = photo.annotation 
            ? `${photo.annotation.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.jpg` 
            : `photo-chantier-${new Date().toISOString()}-${photo.id.substring(0, 8)}.jpg`
          
          // Créer un fichier à partir du blob
          const photoFile = new File([photoBlob], photoName, { type: 'image/jpeg' })
          
          // Créer un FormData pour l'upload
          const photoFormData = new FormData()
          photoFormData.append('file', photoFile)
          photoFormData.append('type', 'photo-chantier')
          
          // Ajouter l'annotation comme metadata
          if (photo.annotation || photo.tags.length > 0) {
            const metadata = {
              annotation: photo.annotation,
              tags: photo.tags
            }
            photoFormData.append('metadata', JSON.stringify(metadata))
          }
          
          // Envoyer la photo au serveur
          await fetch(`/api/chantiers/${params.chantierId}/documents`, {
            method: 'POST',
            body: photoFormData
          })
          
          console.log("Photo ajoutée comme document:", photoName)
        } catch (photoError) {
          console.error("Erreur lors de l'ajout de la photo comme document:", photoError)
          // Continuer avec les autres photos même si une échoue
        }
      }

      // Afficher un message de succès et rediriger
      alert("Rapport envoyé avec succès !")
      clearLocalStorage()
      router.push(`/chantiers/${params.chantierId}/rapports`)
    } catch (error) {
      console.error("Erreur lors de l'envoi du rapport:", error)
      alert("Erreur lors de l'envoi du rapport. Veuillez réessayer.")
    } finally {
      setSaving(false)
    }
  }

  // Fonction pour effacer complètement le formulaire et le localStorage
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
    
    alert("Le formulaire a été réinitialisé.");
  };

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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Modifier le rapport' : 'Nouveau rapport de visite'} - {chantier?.nomChantier}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isEditing 
                ? 'Modifiez les informations du rapport et générez une version mise à jour.'
                : 'Créez un rapport détaillé de votre visite sur le chantier.'}
            </p>
            {isOffline && (
              <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded-md dark:bg-yellow-900/30 dark:text-yellow-500">
                <span className="font-medium">Mode hors ligne actif.</span> Vos modifications sont sauvegardées localement.
              </div>
            )}
            {lastSavedTime && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Dernière sauvegarde locale: {format(lastSavedTime, 'HH:mm:ss')}
              </p>
            )}
          </div>
          
          {!isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
            >
              <XMarkIcon className="mr-2 h-5 w-5 text-gray-400" />
              Réinitialiser le formulaire
            </button>
          )}
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
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Gestion des tags</h2>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
              <FormInput
                id="nouveauTag"
                label="Nouveau tag"
                value={nouveauTag}
                onChange={(e) => setNouveauTag(e.target.value)}
                placeholder="Nom du tag"
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddGlobalTag}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Ajouter un tag
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags disponibles
              </label>
              <div className="flex flex-wrap gap-2">
                {tagsDisponibles.map(tag => (
                  <span 
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {tag}
                    {!TAGS_PAR_DEFAUT.includes(tag) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGlobalTag(tag)}
                        className="ml-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Note: Les tags par défaut ne peuvent pas être supprimés.
              </p>
            </div>

            <div className="mt-6 border-t pt-4 border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Générer un rapport filtré par tag
              </h3>
              <div className="flex items-center space-x-4">
                <div className="flex-grow">
                  <select
                    value={exportTagFilter}
                    onChange={(e) => setExportTagFilter(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="Tous">Rapport complet (tous les tags)</option>
                    {tagsDisponibles.map(tag => (
                      <option key={tag} value={tag}>Rapport pour: {tag}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadFilteredPDF}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-50"
                >
                  <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                  Générer rapport filtré
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Cette option vous permet de générer des rapports PDF séparés pour chaque corps de métier ou catégorie de remarques.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notes</h2>
            
            <div className="mb-6">
              <FormTextarea
                id="nouvelleNote"
                label="Nouvelle note"
                value={nouvelleNote}
                onChange={(e) => setNouvelleNote(e.target.value)}
                placeholder="Saisissez une nouvelle observation ou remarque..."
                rows={3}
              />
              
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags pour cette note
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tagsDisponibles.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleSelectNoteTag(tag)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium
                        ${noteTags.includes(tag) 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={nouvelleNote.trim() === ''}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50"
                >
                  Ajouter la note
                </button>
              </div>
            </div>
            
            {notesIndividuelles.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">
                  Notes enregistrées
                </h3>
                
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notesIndividuelles.map((note, index) => (
                    <div key={note.id} className="py-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Note {index + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveNote(note.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                      
                      <div className="mb-3">
                        <FormTextarea
                          id={`note-${note.id}`}
                          label="Contenu"
                          value={note.contenu}
                          onChange={(e) => handleUpdateNoteContent(note.id, e.target.value)}
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Tags:
                        </span>
                        {note.tags.map(tag => (
                          <span 
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
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
                          className="text-xs border-gray-300 rounded-md py-0.5 pl-2 pr-6 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Aucune note ajoutée
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Photos</h2>
            
            <div className="mb-4 flex items-center justify-between">
              <div>
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
              
              <div className="flex items-center">
                <TagIcon className="h-5 w-5 text-gray-400 mr-2" />
                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="Tous">Tous les tags</option>
                  {tagsDisponibles.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {filteredPhotos.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPhotos.map((photo) => (
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
                    
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tags
                      </label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {photo.tags && photo.tags.map(tag => (
                          <span 
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(photo.id, tag)}
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
                              handleAddTag(photo.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="text-xs border-gray-300 rounded-md py-0.5 pl-2 pr-6 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="">+ Ajouter</option>
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
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {photos.length === 0 ? "Aucune photo ajoutée" : "Aucune photo ne correspond au filtre sélectionné"}
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
              <CheckIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              {saving ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 