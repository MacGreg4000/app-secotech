'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, FolderIcon, DocumentIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { type Chantier } from '@/types/chantier'

interface FicheTechnique {
  id: string
  titre: string
  categorie: string
  sousCategorie?: string | null
  fichierUrl: string
  description?: string | null
  referenceCSC?: string | null
}

interface Dossier {
  nom: string
  chemin: string
  sousDossiers: Dossier[]
  fiches: FicheTechnique[]
}

export default function NouveauDossierTechniquePage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [fichesSearchTerm, setFichesSearchTerm] = useState('')
  const [selectedChantier, setSelectedChantier] = useState<Chantier | null>(null)
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiches, setSelectedFiches] = useState<string[]>([])
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true)
  const [includePageNumbers, setIncludePageNumbers] = useState(true)
  const [structureDossiers, setStructureDossiers] = useState<Dossier[]>([])
  const [ficheReferences, setFicheReferences] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger les chantiers
        const chantiersResponse = await fetch('/api/chantiers')
        const chantiersData = await chantiersResponse.json()
        setChantiers(chantiersData)

        // Charger la structure des dossiers
        const structureResponse = await fetch('/api/fiches-techniques/structure')
        const structureData = await structureResponse.json()
        setStructureDossiers(structureData)

        setLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des données')
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleChantierSelect = (chantierId: string) => {
    const chantier = chantiers.find(c => c.chantierId === chantierId)
    setSelectedChantier(chantier || null)
  }

  const handleFicheSelect = (ficheId: string) => {
    setSelectedFiches(prev => {
      if (prev.includes(ficheId)) {
        return prev.filter(id => id !== ficheId)
      }
      return [...prev, ficheId]
    })
  }

  const handleReferenceChange = (ficheId: string, reference: string) => {
    setFicheReferences(prev => ({
      ...prev,
      [ficheId]: reference
    }))
  }

  const handleGenererDossier = async () => {
    if (!selectedChantier || selectedFiches.length === 0) {
      alert('Veuillez sélectionner un chantier et au moins une fiche technique')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/fiches-techniques/generer-dossier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chantierId: selectedChantier.chantierId,
          ficheIds: selectedFiches,
          ficheReferences: ficheReferences,
          options: {
            includeTableOfContents,
            includePageNumbers
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erreur lors de la génération du dossier')
      }

      // Récupérer le PDF et le télécharger
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dossier-technique-${selectedChantier.chantierId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setLoading(false)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la génération du dossier technique')
      setLoading(false)
    }
  }

  const renderDossier = (dossier: Dossier) => {
    // Filtrer les fiches si un terme de recherche est présent
    const filteredFiches = fichesSearchTerm 
      ? dossier.fiches.filter(fiche => 
          fiche.titre.toLowerCase().includes(fichesSearchTerm.toLowerCase()) ||
          (fiche.description && fiche.description.toLowerCase().includes(fichesSearchTerm.toLowerCase())))
      : dossier.fiches;
    
    // Si aucune fiche ne correspond et aucun sous-dossier n'a de correspondance, ne pas afficher ce dossier
    const hasFiches = filteredFiches.length > 0;
    
    // Vérifier si les sous-dossiers contiennent des fiches correspondantes
    const sousDossiersWithMatches = dossier.sousDossiers
      .map(sd => {
        const result = renderDossier(sd);
        return result ? true : false;
      })
      .some(Boolean);
    
    // Ne pas rendre le dossier si aucune correspondance n'est trouvée
    if (fichesSearchTerm && !hasFiches && !sousDossiersWithMatches) {
      return null;
    }
    
    return (
      <div key={`folder-${dossier.chemin}`} className="ml-4 mb-3">
        <div className="flex items-center text-gray-700 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
          <FolderIcon className="h-5 w-5 mr-2 text-amber-500" />
          <span className="font-semibold">{dossier.nom}</span>
        </div>
        
        {/* Sous-dossiers */}
        <div className="ml-4 mt-2">
          {dossier.sousDossiers.map(sousDossier => renderDossier(sousDossier))}
        </div>
        
        {/* Fiches techniques */}
        {filteredFiches.length > 0 && (
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-100 dark:border-gray-600 pl-3">
            {filteredFiches.map(fiche => (
              <div key={`file-${fiche.id}`} className="flex items-start space-x-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors">
                <DocumentIcon className="h-4 w-4 text-blue-500 mt-1" />
                <div className="flex flex-col w-full">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedFiches.includes(fiche.id)}
                      onChange={() => handleFicheSelect(fiche.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm dark:text-gray-300 font-medium">{fiche.titre}</span>
                  </div>
                  {selectedFiches.includes(fiche.id) && (
                    <input
                      type="text"
                      placeholder="Référence CSC"
                      value={ficheReferences[fiche.id] || ''}
                      onChange={(e) => handleReferenceChange(fiche.id, e.target.value)}
                      className="ml-6 mt-1 text-sm dark:text-gray-300 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md w-48"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.back()}
          className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold dark:text-white">Générer un Dossier Technique</h1>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Colonne de gauche (1/3) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Sélection du chantier */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Sélection du chantier</h2>
            <input
              type="text"
              placeholder="Rechercher un chantier..."
              className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="mt-4 max-h-48 overflow-y-auto">
              {chantiers
                .filter(chantier => 
                  chantier.etatChantier === 'En cours' &&
                  chantier.nomChantier.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(chantier => (
                  <div
                    key={chantier.chantierId}
                    className={`p-2 cursor-pointer rounded-md ${
                      selectedChantier?.chantierId === chantier.chantierId
                        ? 'bg-blue-50 dark:bg-blue-900'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => handleChantierSelect(chantier.chantierId)}
                  >
                    {chantier.nomChantier}
                  </div>
                ))}
            </div>
          </div>

          {/* Informations du chantier sélectionné */}
          {selectedChantier && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">Informations du chantier</h2>
              <div className="space-y-2">
                <p><span className="font-semibold">Nom :</span> {selectedChantier.nomChantier}</p>
                <p><span className="font-semibold">Client :</span> {selectedChantier.clientNom}</p>
                <p><span className="font-semibold">Adresse :</span> {selectedChantier.adresseChantier}</p>
                <p><span className="font-semibold">Date de début :</span> {new Date(selectedChantier.dateCommencement).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          
          {/* Options de génération */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Options de génération</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="dark:text-gray-300">Inclure page de garde personnalisée</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeTableOfContents}
                  onChange={(e) => setIncludeTableOfContents(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="dark:text-gray-300">Ajouter table des matières</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includePageNumbers}
                  onChange={(e) => setIncludePageNumbers(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="dark:text-gray-300">Numéroter les pages</span>
              </label>
            </div>
          </div>
        </div>

        {/* Colonne de droite (2/3) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Sélection des fiches techniques */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Fiches techniques disponibles</h2>
            
            {/* Champ de recherche pour les fiches */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Filtrer les fiches techniques..."
                value={fichesSearchTerm}
                onChange={(e) => setFichesSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
              {fichesSearchTerm && (
                <button 
                  onClick={() => setFichesSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                >
                  <span className="text-sm">×</span>
                </button>
              )}
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {structureDossiers.map(dossier => renderDossier(dossier))}
              
              {fichesSearchTerm && structureDossiers.every(dossier => !renderDossier(dossier)) && (
                <div className="text-center py-4 text-gray-500">
                  Aucune fiche ne correspond à votre recherche
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bouton de génération */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleGenererDossier}
          disabled={!selectedChantier || selectedFiches.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Générer le dossier PDF
        </button>
      </div>
    </div>
  )
} 