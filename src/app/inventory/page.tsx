'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RackWithEmplacements, Materiau } from '@/types/inventory'
import { Breadcrumb } from '@/components/Breadcrumb'
import { QrCodeIcon } from '@heroicons/react/24/outline'
import EmplacementQRCodeModal from '@/components/inventory/EmplacementQRCodeModal'

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [racks, setRacks] = useState<RackWithEmplacements[]>([])
  const [materiaux, setMateriaux] = useState<Materiau[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Materiau[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  // Pour l'ajout de matériaux
  const [selectedEmplacement, setSelectedEmplacement] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedRackForAddition, setSelectedRackForAddition] = useState<RackWithEmplacements | null>(null)
  const [materiauData, setMateriauData] = useState({
    nom: '',
    description: '',
    quantite: ''
  })
  const [submitting, setSubmitting] = useState(false)
  
  // Pour la gestion des QR codes
  const [showQRCodeModal, setShowQRCodeModal] = useState(false)
  const [currentQRCodeEmplacement, setCurrentQRCodeEmplacement] = useState<{
    id: string,
    rackNom: string,
    position: string,
    qrCodeValue: string
  } | null>(null)

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Charger les racks
        const racksResponse = await fetch('/api/inventory/racks')
        if (!racksResponse.ok) {
          throw new Error('Erreur lors du chargement des racks')
        }
        const racksData = await racksResponse.json()
        setRacks(racksData)
        
        // Charger les matériaux
        const materiauxResponse = await fetch('/api/inventory/materiaux')
        if (!materiauxResponse.ok) {
          throw new Error('Erreur lors du chargement des matériaux')
        }
        const materiauxData = await materiauxResponse.json()
        setMateriaux(materiauxData)
        
        // Rechercher des paramètres d'URL pour la pré-sélection d'un emplacement
        const emplacementId = searchParams.get('emplacementId')
        const rackId = searchParams.get('rackId')
        
        if (emplacementId && rackId) {
          // Si les paramètres sont présents, sélectionner automatiquement l'emplacement
          const rack = racksData.find((r: RackWithEmplacements) => r.id === rackId)
          if (rack) {
            setSelectedRackForAddition(rack)
            setSelectedEmplacement(emplacementId)
            setShowAddForm(true)
          }
        }
        
      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur lors du chargement des données')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
    
    // Charger les recherches récentes du localStorage
    const savedSearches = localStorage.getItem('recentInventorySearches')
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches))
    }
  }, [searchParams])
  
  // Recherche de matériaux
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }
    
    // Rechercher par nom ou description
    const results = materiaux.filter(m => 
      m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    
    setSearchResults(results)
    
    // Ajouter aux recherches récentes si pas déjà présent
    if (!recentSearches.includes(searchTerm)) {
      const updatedSearches = [searchTerm, ...recentSearches.slice(0, 4)]
      setRecentSearches(updatedSearches)
      localStorage.setItem('recentInventorySearches', JSON.stringify(updatedSearches))
    }
  }
  
  // Sélectionner un emplacement pour ajouter un matériau
  const handleEmplacementSelect = (emplacementId: string, rack: RackWithEmplacements) => {
    setSelectedEmplacement(emplacementId)
    setSelectedRackForAddition(rack)
    setShowAddForm(true)
  }
  
  // Gestion de l'ajout d'un matériau
  const handleAddMateriau = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedEmplacement || !selectedRackForAddition) {
      return
    }
    
    try {
      setSubmitting(true)
      
      const materiau = {
        nom: materiauData.nom,
        description: materiauData.description,
        quantite: parseFloat(materiauData.quantite) || 1,
        emplacementId: selectedEmplacement
      }
      
      const response = await fetch('/api/inventory/materiaux', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(materiau)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout du matériau')
      }
      
      // Rafraîchir les données
      const racksResponse = await fetch('/api/inventory/racks')
      const materiauxResponse = await fetch('/api/inventory/materiaux')
      
      if (racksResponse.ok && materiauxResponse.ok) {
        const racksData = await racksResponse.json()
        const materiauxData = await materiauxResponse.json()
        
        setRacks(racksData)
        setMateriaux(materiauxData)
      }
      
      // Réinitialiser le formulaire
      setMateriauData({
        nom: '',
        description: '',
        quantite: ''
      })
      setSelectedEmplacement(null)
      setShowAddForm(false)
      setSelectedRackForAddition(null)
      
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors de l\'ajout du matériau')
    } finally {
      setSubmitting(false)
    }
  }

  // Générer la visualisation d'un rack
  const renderRackVisualization = (rack: RackWithEmplacements) => {
    const preview = []
    
    // En-têtes des colonnes
    const colHeaders = []
    for (let col = 1; col <= rack.colonnes; col++) {
      colHeaders.push(
        <th key={`col-${col}`} className="p-2 border text-center">{col}</th>
      )
    }
    preview.push(
      <tr key="col-headers">
        <th></th>
        {colHeaders}
      </tr>
    )
    
    // Lignes du rack
    for (let ligne = 1; ligne <= rack.lignes; ligne++) {
      const rowCells = []
      for (let col = 1; col <= rack.colonnes; col++) {
        // Trouver l'emplacement correspondant
        const emplacement = rack.emplacements.find(
          e => e.ligne === ligne && e.colonne === col
        )
        
        // Déterminer la classe CSS en fonction du statut
        let cellClass = "p-2 border text-center "
        let materiauInfo = null
        
        if (!emplacement) {
          cellClass += "bg-gray-200"
          rowCells.push(
            <td key={`cell-${ligne}-${col}`} className={cellClass}>
              N/A
            </td>
          )
          continue
        }
        
        // Style en fonction du statut de l'emplacement
        if (emplacement.id === selectedEmplacement) {
          cellClass += "bg-blue-500 text-white"
        } else if (emplacement.statut === 'occupé') {
          cellClass += "bg-red-500 text-white"
          // Afficher le nom du matériau
          if (emplacement.materiaux.length > 0) {
            materiauInfo = emplacement.materiaux[0].nom
          }
        } else {
          cellClass += "bg-green-100 hover:bg-green-200"
        }
        
        // Recherche de résultats
        if (searchResults.length > 0) {
          const isInSearchResults = searchResults.some(materiau => 
            materiau.emplacement && materiau.emplacement.id === emplacement.id
          )
          if (isInSearchResults) {
            cellClass = "p-2 border text-center bg-blue-500 text-white"
          }
        }
        
        rowCells.push(
          <td 
            key={`cell-${ligne}-${col}`} 
            className={cellClass}
            onClick={() => emplacement && emplacement.statut !== 'occupé' && handleEmplacementSelect(emplacement.id, rack)}
            onContextMenu={(e) => {
              e.preventDefault();
              // Générer un QR code pour cet emplacement
              generateQRForEmplacement(rack.id, rack.nom, emplacement.id, ligne, col);
            }}
            title={emplacement && emplacement.statut === 'occupé' 
              ? `Occupé: ${emplacement.materiaux[0]?.nom || 'Matériau inconnu'} - Clic droit pour QR code` 
              : emplacement 
                ? `Emplacement ${String.fromCharCode(64 + ligne)}${col} - Cliquez pour sélectionner, clic droit pour QR code` 
                : "Emplacement non disponible"
            }
          >
            {materiauInfo || (emplacement ? String.fromCharCode(64 + ligne) + col : 'N/A')}
          </td>
        )
      }
      
      preview.push(
        <tr key={`row-${ligne}`}>
          <th className="p-2 border text-center">{String.fromCharCode(64 + ligne)}</th>
          {rowCells}
        </tr>
      )
    }
    
    return (
      <table className="border-collapse border mt-4 w-full">
        <tbody>
          {preview}
        </tbody>
      </table>
    )
  }
  
  // Générer un QR code pour un emplacement
  const generateQRForEmplacement = (rackId: string, rackNom: string, emplacementId: string, ligne: number, colonne: number) => {
    // Générer une chaîne unique pour l'emplacement au format EMP-[ID_DU_RACK]-[LIGNE]-[COLONNE]
    const emplacementCode = `EMP-${rackId.substring(0, 8)}-${ligne}-${colonne}`;
    
    // Afficher le modal avec les informations du QR code
    setCurrentQRCodeEmplacement({
      id: emplacementId,
      rackNom: rackNom,
      position: `${String.fromCharCode(64 + ligne)}${colonne}`,
      qrCodeValue: emplacementCode
    });
    
    setShowQRCodeModal(true);
  }
  
  return (
    <div className="container mx-auto">
      <Breadcrumb
        items={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Inventaire' }
        ]}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion de l'inventaire</h1>
        <Link
          href="/inventory/scanner"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <QrCodeIcon className="mr-2 h-5 w-5" />
          Scanner un QR code
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
        {/* Zone principale */}
        <div className="w-full md:w-3/4 space-y-6">
          {/* Barre de recherche */}
          <div className="bg-white p-4 rounded-lg shadow">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                placeholder="Rechercher un matériau..."
                className="flex-grow px-3 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700"
              >
                Rechercher
              </button>
            </form>
            
            {recentSearches.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Recherches récentes:</p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchTerm(term)
                        // Soumettre automatiquement
                        const results = materiaux.filter(m => 
                          m.nom.toLowerCase().includes(term.toLowerCase()) ||
                          (m.description && m.description.toLowerCase().includes(term.toLowerCase()))
                        )
                        setSearchResults(results)
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Liste des racks */}
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2">Chargement de l'inventaire...</p>
            </div>
          ) : (
            <>
              {racks.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                  <p className="text-gray-500">Aucun rack n'a été configuré. Veuillez contacter un administrateur.</p>
                </div>
              ) : (
                racks.map((rack) => (
                  <div key={rack.id} className="bg-white shadow-md rounded p-4 mb-6 overflow-auto">
                    <h2 className="text-xl font-semibold mb-2">
                      {rack.nom} - {rack.position}
                    </h2>
                    <div className="overflow-x-auto">
                      {renderRackVisualization(rack)}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-100 border border-gray-300 mr-2"></div>
                        <span className="text-sm">Libre</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 border border-gray-300 mr-2"></div>
                        <span className="text-sm">Occupé</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 border border-gray-300 mr-2"></div>
                        <span className="text-sm">Sélectionné/Résultat</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
          
          {/* Lien vers la gestion des racks (admin) */}
          <div className="mt-6 text-right">
            <Link 
              href="/admin/inventory" 
              className="text-blue-500 hover:text-blue-700"
            >
              Administration des racks →
            </Link>
          </div>
        </div>
        
        {/* Panneau latéral */}
        <div className="w-full md:w-1/4 space-y-6">
          {/* Résultats de recherche */}
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-semibold mb-4">Résultats de recherche</h2>
            
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map(materiau => (
                  <div key={materiau.id} className="border-b pb-3">
                    <h3 className="font-medium">{materiau.nom}</h3>
                    <p className="text-sm text-gray-600">{materiau.description || 'Aucune description'}</p>
                    <p className="text-sm mt-1">
                      <span className="font-medium">Quantité:</span> {typeof materiau.quantite === 'number' ? materiau.quantite.toFixed(2) : materiau.quantite}
                    </p>
                    {materiau.emplacement && materiau.emplacement.rack && (
                      <p className="text-sm text-blue-500 mt-1">
                        {materiau.emplacement.rack.nom} - 
                        {String.fromCharCode(64 + materiau.emplacement.ligne)}
                        {materiau.emplacement.colonne}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                {searchTerm ? 'Aucun résultat trouvé' : 'Utilisez la barre de recherche pour trouver des matériaux'}
              </p>
            )}
          </div>
          
          {/* Formulaire d'ajout */}
          {selectedEmplacement && showAddForm && selectedRackForAddition && (
            <div className="bg-white shadow-md rounded p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Ajouter un matériau</h2>
                <button 
                  onClick={() => {
                    setSelectedEmplacement(null)
                    setShowAddForm(false)
                    setSelectedRackForAddition(null)
                  }} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Emplacement sélectionné */}
              <div className="mb-4 py-2 px-3 bg-blue-50 text-blue-700 rounded">
                {(() => {
                  const emplacement = selectedRackForAddition.emplacements.find(e => e.id === selectedEmplacement)
                  if (emplacement) {
                    return `Rack: ${selectedRackForAddition.nom}
                    Emplacement: ${String.fromCharCode(64 + emplacement.ligne)}${emplacement.colonne}`
                  }
                  return 'Emplacement sélectionné'
                })()}
              </div>
              
              <form onSubmit={handleAddMateriau} className="space-y-4">
                <div>
                  <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
                    Nom du matériau *
                  </label>
                  <input
                    type="text"
                    id="nom"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={materiauData.nom}
                    onChange={(e) => setMateriauData({...materiauData, nom: e.target.value})}
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={materiauData.description}
                    onChange={(e) => setMateriauData({...materiauData, description: e.target.value})}
                  />
                </div>
                
                <div>
                  <label htmlFor="quantite" className="block text-sm font-medium text-gray-700">
                    Quantité
                  </label>
                  <input
                    type="number"
                    id="quantite"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={materiauData.quantite}
                    onChange={(e) => setMateriauData({...materiauData, quantite: e.target.value})}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {submitting ? 'Ajout en cours...' : 'Ajouter ce matériau'}
                </button>
              </form>
            </div>
          )}
          
          {/* Instructions */}
          <div className="bg-white shadow-md rounded p-4">
            <h2 className="text-lg font-semibold mb-2">Instructions</h2>
            <ul className="text-sm text-gray-600 space-y-1 list-disc pl-4">
              <li>Cliquez sur un emplacement <span className="text-green-600 font-medium">libre</span> pour y ajouter un matériau</li>
              <li>Clic droit sur un emplacement pour générer son QR code</li>
              <li>Utilisez la recherche pour trouver des matériaux spécifiques</li>
              <li>Utilisez le scanner pour interagir avec les emplacements via QR codes</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Modal pour afficher un QR code */}
      {showQRCodeModal && currentQRCodeEmplacement && (
        <EmplacementQRCodeModal
          emplacementId={currentQRCodeEmplacement.id}
          rackNom={currentQRCodeEmplacement.rackNom}
          position={currentQRCodeEmplacement.position}
          qrCodeValue={currentQRCodeEmplacement.qrCodeValue}
          onClose={() => setShowQRCodeModal(false)}
        />
      )}
    </div>
  )
} 