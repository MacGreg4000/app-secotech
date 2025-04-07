'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, FolderIcon, DocumentIcon } from '@heroicons/react/24/outline'
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
    return (
      <div key={dossier.chemin} className="ml-4">
        <div className="flex items-center text-gray-700 dark:text-gray-300">
          <FolderIcon className="h-5 w-5 mr-2" />
          <span className="font-medium">{dossier.nom}</span>
        </div>
        
        {/* Sous-dossiers */}
        {dossier.sousDossiers.map(sousDossier => renderDossier(sousDossier))}
        
        {/* Fiches techniques */}
        {dossier.fiches.map(fiche => (
          <div key={fiche.id} className="ml-7 flex items-center space-x-2">
            <DocumentIcon className="h-4 w-4 text-gray-500" />
            <div className="flex items-center space-x-2 w-full">
              <input
                type="checkbox"
                checked={selectedFiches.includes(fiche.id)}
                onChange={() => handleFicheSelect(fiche.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm dark:text-gray-300">{fiche.titre}</span>
              {selectedFiches.includes(fiche.id) && (
                <input
                  type="text"
                  placeholder="Référence CSC"
                  value={ficheReferences[fiche.id] || ''}
                  onChange={(e) => handleReferenceChange(fiche.id, e.target.value)}
                  className="ml-2 text-sm dark:text-gray-300 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md w-32"
                />
              )}
            </div>
          </div>
        ))}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colonne de gauche */}
        <div className="space-y-6">
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
        </div>

        {/* Colonne de droite */}
        <div className="space-y-6">
          {/* Sélection des fiches techniques */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Fiches techniques disponibles</h2>
            <div className="space-y-4">
              {structureDossiers.map(dossier => renderDossier(dossier))}
            </div>
          </div>

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