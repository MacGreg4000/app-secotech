'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Rack } from '@/types/inventory'
import { Breadcrumb } from '@/components/Breadcrumb'

export default function RackAdminPage() {
  const router = useRouter()
  const [racks, setRacks] = useState<Rack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // État pour le nouveau rack
  const [showForm, setShowForm] = useState(false)
  const [nom, setNom] = useState('')
  const [position, setPosition] = useState('')
  const [lignes, setLignes] = useState(4)
  const [colonnes, setColonnes] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  
  // Chargement des racks
  useEffect(() => {
    const loadRacks = async () => {
      try {
        const response = await fetch('/api/inventory/racks')
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des racks')
        }
        const data = await response.json()
        setRacks(data)
      } catch (err) {
        setError('Erreur lors du chargement des racks')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    loadRacks()
  }, [])
  
  // Créer un nouveau rack
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const response = await fetch('/api/inventory/racks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom,
          position,
          lignes: Number(lignes),
          colonnes: Number(colonnes),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création du rack')
      }
      
      const newRack = await response.json()
      setRacks([newRack, ...racks])
      
      // Réinitialiser le formulaire
      setNom('')
      setPosition('')
      setLignes(4)
      setColonnes(5)
      setShowForm(false)
    } catch (err) {
      setError('Erreur lors de la création du rack')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }
  
  // Générer la prévisualisation du rack
  const renderRackPreview = () => {
    const preview = []
    
    // En-têtes des colonnes
    const colHeaders = []
    for (let col = 1; col <= colonnes; col++) {
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
    for (let ligne = 1; ligne <= lignes; ligne++) {
      const rowCells = []
      for (let col = 1; col <= colonnes; col++) {
        rowCells.push(
          <td key={`cell-${ligne}-${col}`} className="p-2 border text-center bg-gray-100">
            &nbsp;
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
      <table className="border-collapse border mt-4">
        <tbody>
          {preview}
        </tbody>
      </table>
    )
  }
  
  return (
    <div className="container mx-auto">
      <Breadcrumb
        items={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Inventaire', href: '/inventory' },
          { label: 'Administration des Racks' }
        ]}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Administration des Racks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showForm ? 'Annuler' : '+ Ajouter un Rack'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {showForm && (
        <div className="bg-white shadow-md rounded p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ajouter un nouveau rack</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Informations générales</h3>
                <div className="mb-4">
                  <label htmlFor="nom" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du rack
                  </label>
                  <input
                    type="text"
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <h3 className="text-lg font-medium mb-3 mt-6">Configuration des dimensions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lignes" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de lignes
                    </label>
                    <input
                      type="number"
                      id="lignes"
                      min="1"
                      max="26"
                      value={lignes}
                      onChange={(e) => setLignes(parseInt(e.target.value))}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="colonnes" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de colonnes
                    </label>
                    <input
                      type="number"
                      id="colonnes"
                      min="1"
                      max="20"
                      value={colonnes}
                      onChange={(e) => setColonnes(parseInt(e.target.value))}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-3">Prévisualisation</h3>
                <div className="overflow-auto max-h-96">
                  {renderRackPreview()}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  * Les lignes sont étiquetées avec des lettres (A, B, C...) et les colonnes avec des chiffres (1, 2, 3...)
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="mr-2 px-4 py-2 text-gray-700 border rounded"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {submitting ? "Création en cours..." : "Créer le rack"}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Chargement des racks...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {racks.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500">
              Aucun rack n&apos;a été ajouté. Créez votre premier rack en cliquant sur &quot;+ Ajouter un Rack&quot;
            </div>
          ) : (
            racks.map((rack) => (
              <div key={rack.id} className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">{rack.nom}</h3>
                <p className="text-gray-600 mb-4">Position: {rack.position}</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-500">Lignes</span>
                    <p className="font-medium">{rack.lignes}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Colonnes</span>
                    <p className="font-medium">{rack.colonnes}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => router.push(`/admin/inventory/${rack.id}`)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Voir les détails →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
} 