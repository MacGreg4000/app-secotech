'use client'
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  DocumentCheckIcon,
  PhotoIcon,
  CameraIcon,
  TrashIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { Toaster, toast } from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

interface LigneEtatAvancement {
  id?: number;
  ligneCommandeId: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  quantitePrecedente: number;
  quantiteActuelle: number;
  quantiteTotale: number;
  montantPrecedent: number;
  montantActuel: number;
  montantTotal: number;
}

interface EtatAvancement {
  id?: number;
  soustraitantId: string;
  commandeId?: number;
  numero: number;
  date: string;
  commentaires?: string;
  lignes: LigneEtatAvancement[];
  avenants: any[]; // Simplifié pour l'exemple
  estFinalise: boolean;
}

interface CommandeSousTraitant {
  id: number;
  reference: string;
  soustraitantNom: string;
  lignes: {
    id: number;
    article: string;
    description: string;
    type: string;
    unite: string;
    prixUnitaire: number;
    quantite: number;
    total: number;
  }[];
}

export default function NouvelEtatAvancementPage(
  props: {
    params: Promise<{ chantierId: string; soustraitantId: string }>
  }
) {
  const params = use(props.params);
  const { data: session } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commandeValidee, setCommandeValidee] = useState<CommandeSousTraitant | null>(null)
  const [etatAvancement, setEtatAvancement] = useState<EtatAvancement | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // 1. Récupérer la commande sous-traitant validée
        const commandesResponse = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes`)
        
        if (!commandesResponse.ok) {
          throw new Error('Erreur lors de la récupération des commandes sous-traitant')
        }
        
        const commandes = await commandesResponse.json()
        console.log('Commandes récupérées:', commandes)
        
        const commandeValidee = commandes.find((c: any) => c.estVerrouillee)
        
        if (!commandeValidee) {
          setError('Aucune commande sous-traitant validée trouvée pour ce sous-traitant')
          setLoading(false)
          return
        }

        // Vérifier si la commande a des lignes
        if (!commandeValidee.lignes || !Array.isArray(commandeValidee.lignes) || commandeValidee.lignes.length === 0) {
          console.error('La commande ne contient pas de lignes valides:', commandeValidee)
          setError('Commande invalide ou sans lignes')
          setLoading(false)
          return
        }
        
        console.log('Commande validée avec lignes:', commandeValidee)
        setCommandeValidee(commandeValidee)
        
        // 2. Récupérer le dernier état d'avancement
        const etatsResponse = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement`)
        
        const dernierEtatNumero = 0
        let dernierEtat: any = null
        
        if (etatsResponse.ok) {
          const etats = await etatsResponse.json()
          
          if (etats && etats.length > 0) {
            dernierEtat = etats.reduce((max: any, etat: any) => 
              etat.numero > max.numero ? etat : max, etats[0])
            
            if (!dernierEtat.estFinalise) {
              setError('L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état')
              setLoading(false)
              return
            }
          }
        }
        
        // 3. Préparer le nouvel état d'avancement
        const nouvelEtat: EtatAvancement = {
          soustraitantId: params.soustraitantId,
          commandeId: commandeValidee.id,
          numero: dernierEtat ? dernierEtat.numero + 1 : 1,
          date: new Date().toISOString().split('T')[0],
          commentaires: '',
          estFinalise: false,
          avenants: [],
          lignes: commandeValidee.lignes.map((ligne: any) => {
            const lignePrecedente = dernierEtat?.lignes?.find((l: any) => l.ligneCommandeId === ligne.id)
            
            const quantitePrecedente = lignePrecedente ? lignePrecedente.quantiteTotale : 0
            const montantPrecedent = lignePrecedente ? lignePrecedente.montantTotal : 0
            
            return {
              ligneCommandeId: ligne.id,
              article: ligne.article,
              description: ligne.description,
              type: ligne.type || 'QP',
              unite: ligne.unite,
              prixUnitaire: ligne.prixUnitaire,
              quantite: ligne.quantite,
              quantitePrecedente: quantitePrecedente,
              quantiteActuelle: 0,
              quantiteTotale: quantitePrecedente,
              montantPrecedent: montantPrecedent,
              montantActuel: 0,
              montantTotal: montantPrecedent
            }
          })
        }
        
        setEtatAvancement(nouvelEtat)
        setLoading(false)
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
        setError('Erreur lors du chargement des données')
        setLoading(false)
      }
    }
    
    if (session) {
      fetchData()
    }
  }, [session, params.chantierId, params.soustraitantId])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files)
      setPhotos(prev => [...prev, ...newPhotos])
      
      // Générer des previews
      const newPreviews = newPhotos.map(file => URL.createObjectURL(file))
      setPhotosPreviews(prev => [...prev, ...newPreviews])
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    URL.revokeObjectURL(photosPreviews[index])
    setPhotosPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveEtat = async (finalise: boolean = false) => {
    if (!etatAvancement) return
    
    try {
      setLoading(true)
      
      // Vérifier si au moins une ligne a une quantité actuelle
      const hasQuantite = etatAvancement.lignes.some(ligne => ligne.quantiteActuelle > 0)
      
      if (!hasQuantite) {
        toast.error('Au moins une ligne doit avoir une quantité')
        setLoading(false)
        return
      }
      
      // Créer l'état d'avancement
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...etatAvancement,
          estFinalise: finalise
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création de l\'état d\'avancement')
      }
      
      const etatCree = await response.json()
      
      // Si des photos ont été ajoutées, les télécharger
      if (photos.length > 0) {
        const formData = new FormData()
        photos.forEach(photo => {
          formData.append('photos', photo)
        })
        
        await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etatCree.id}/photos`, {
          method: 'POST',
          body: formData,
        })
      }
      
      toast.success(`État d'avancement ${finalise ? 'finalisé' : 'enregistré'} avec succès`)
      router.push(`/chantiers/${params.chantierId}/etats`)
    } catch (error) {
      console.error('Erreur lors de la création:', error)
      toast.error('Erreur lors de la création de l\'état d\'avancement')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="container mx-auto py-6">
      <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
        {error}
      </div>
      <div className="mt-4">
        <Link
          href={`/chantiers/${params.chantierId}/etats`}
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Retour
        </Link>
      </div>
    </div>
  )

  if (!etatAvancement) return (
    <div className="container mx-auto py-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
        Données non disponibles
      </div>
      <div className="mt-4">
        <Link
          href={`/chantiers/${params.chantierId}/etats`}
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Retour
        </Link>
      </div>
    </div>
  )

  // Calcul des totaux pour l'affichage
  const totalMontantActuel = etatAvancement.lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0)
  const totalMontantGlobal = etatAvancement.lignes.reduce((sum, ligne) => sum + ligne.montantTotal, 0)
  const totalCommande = commandeValidee?.lignes.reduce((sum, ligne) => sum + ligne.total, 0) || 0
  const pourcentageAvancement = totalCommande > 0 ? Math.round((totalMontantGlobal / totalCommande) * 100) : 0

  return (
    <div className="container mx-auto py-6">
      <Toaster position="top-right" />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-6">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <Link
                href={`/chantiers/${params.chantierId}/etats`}
                className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md transition-all hover:shadow-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                  Nouvel état d'avancement sous-traitant
                </h1>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center">
                    <DocumentCheckIcon className="h-4 w-4 mr-1 text-blue-500" />
                    {commandeValidee?.soustraitantNom} - État #{etatAvancement.numero}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveEtat(false)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Enregistrer (brouillon)
              </button>
              <button
                onClick={() => handleSaveEtat(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
              >
                <CheckIcon className="h-5 w-5 mr-2" />
                Finaliser
              </button>
            </div>
          </div>
        </div>
        
        {/* Info */}
        <div className="p-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                  Montant de cet état: {totalMontantActuel.toLocaleString('fr-FR')} € HT
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Total cumulé: {totalMontantGlobal.toLocaleString('fr-FR')} € HT ({pourcentageAvancement}%)
                </p>
              </div>
              <div>
                <div className="flex items-center mt-3 md:mt-0">
                  <label htmlFor="date" className="block text-sm font-medium text-blue-800 dark:text-blue-300 mr-2">
                    Date:
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={etatAvancement.date.split('T')[0]}
                    onChange={(e) => setEtatAvancement(prev => prev ? { ...prev, date: e.target.value } : null)}
                    className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Tableau des lignes */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-16">
                    Art.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-16">
                    Unité
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-20">
                    P.U. (€)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-24">
                    Prévu
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-28">
                    Précédent
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-24">
                    Actuel
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-28">
                    Cumulé
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 w-28">
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                {etatAvancement.lignes.map((ligne, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ligne.article}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {ligne.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ligne.unite}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {ligne.prixUnitaire.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {ligne.quantite.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {ligne.quantitePrecedente.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 text-right">
                      <input
                        type="number"
                        value={ligne.quantiteActuelle || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          const newLignes = [...etatAvancement.lignes];
                          newLignes[index].quantiteActuelle = value;
                          newLignes[index].quantiteTotale = value + ligne.quantitePrecedente;
                          newLignes[index].montantActuel = value * ligne.prixUnitaire;
                          newLignes[index].montantTotal = newLignes[index].montantActuel + ligne.montantPrecedent;
                          setEtatAvancement({...etatAvancement, lignes: newLignes});
                        }}
                        step="0.01"
                        min="0"
                        max={ligne.quantite - ligne.quantitePrecedente > 0 ? ligne.quantite - ligne.quantitePrecedente : 0}
                        className="w-full px-2 py-1 border border-blue-300 dark:border-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-right"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                      {ligne.quantiteTotale.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                      {ligne.montantActuel.toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td colSpan={8} className="px-6 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total cet état:
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                    {totalMontantActuel.toLocaleString('fr-FR')} €
                  </td>
                </tr>
                <tr>
                  <td colSpan={8} className="px-6 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total cumulé:
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                    {totalMontantGlobal.toLocaleString('fr-FR')} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Commentaires */}
          <div className="mb-6">
            <label htmlFor="commentaires" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Commentaires
            </label>
            <textarea
              id="commentaires"
              rows={4}
              value={etatAvancement.commentaires || ''}
              onChange={(e) => setEtatAvancement({...etatAvancement, commentaires: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Commentaires additionnels..."
            ></textarea>
          </div>
          
          {/* Photos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Photos
            </label>
            
            <div className="flex flex-wrap gap-4 mb-4">
              {photosPreviews.map((preview, index) => (
                <div key={index} className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                  <Image 
                    src={preview} 
                    alt={`Photo ${index + 1}`} 
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              <label className="flex items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer bg-gray-50 dark:bg-gray-800">
                <div className="text-center">
                  <CameraIcon className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
                  <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ajouter</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          </div>
          
          {/* Boutons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => handleSaveEtat(false)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Enregistrer (brouillon)
            </button>
            <button
              onClick={() => handleSaveEtat(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
            >
              <CheckIcon className="h-5 w-5 mr-2" />
              Finaliser
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 