'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { type Chantier } from '@/types/chantier'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'

interface Client {
  id: string
  nom: string
  email: string | null
  adresse: string | null
}

interface FormData {
  nomChantier: string
  dateCommencement: string
  etatChantier: string
  adresseChantier: string
  dureeEnJours: string
  clientId: string
}

export default function EditChantierPage({ params }: { params: { chantierId: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    nomChantier: '',
    dateCommencement: '',
    etatChantier: '',
    adresseChantier: '',
    dureeEnJours: '',
    clientId: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Charger la liste des clients
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients')
        const data = await response.json()
        setClients(data)
      } catch (error) {
        console.error('Erreur lors du chargement des clients:', error)
        setError('Erreur lors du chargement des clients')
      }
    }

    // Charger les données du chantier
    const fetchChantier = async () => {
      try {
        const response = await fetch(`/api/chantiers/${params.chantierId}`)
        const data = await response.json()
        setChantier(data)
        setSelectedClientId(data.clientId || '')
        setFormData({
          nomChantier: data.nomChantier,
          dateCommencement: data.dateCommencement ? new Date(data.dateCommencement).toISOString().split('T')[0] : '',
          etatChantier: data.etatChantier || '',
          adresseChantier: data.adresseChantier || '',
          dureeEnJours: data.dureeEnJours?.toString() || '',
          clientId: data.clientId || ''
        })
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
    fetchChantier()
  }, [params.chantierId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Récupérer le montant total actuel du chantier
      const chantierResponse = await fetch(`/api/chantiers/${params.chantierId}`);
      const chantierData = await chantierResponse.json();
      
      const response = await fetch(`/api/chantiers/${params.chantierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          montantTotal: chantierData.montantTotal || 0, // Préserver le montant total existant
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de la mise à jour')

      router.push('/chantiers')
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la mise à jour du chantier')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!chantier) return <div className="p-8">Chantier non trouvé</div>

  return (
    <div className="container mx-auto py-6">
      <DocumentExpirationAlert />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 px-6 py-5 border-b-2 border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/chantiers/${params.chantierId}/etats`)}
                className="mr-3 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md transition-all hover:shadow-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white drop-shadow-sm">
                  Modifier le chantier
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Modifiez les informations du chantier et cliquez sur Enregistrer pour valider les changements
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
              {error}
            </div>
          ) : !chantier ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
              Chantier non trouvé
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 mb-6">
                  <h2 className="text-lg font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    Informations générales
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nom du chantier
                      </label>
                      <input
                        type="text"
                        name="nomChantier"
                        value={formData.nomChantier}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          nomChantier: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Client <span className="text-xs text-gray-500 dark:text-gray-400">(Déroulant)</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedClientId}
                          onChange={(e) => {
                            setSelectedClientId(e.target.value);
                            setFormData(prev => ({
                              ...prev,
                              clientId: e.target.value
                            }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
                          required
                        >
                          <option value="">Sélectionner un client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.nom}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date de commencement
                      </label>
                      <input
                        type="date"
                        name="dateCommencement"
                        value={formData.dateCommencement}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          dateCommencement: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        État du chantier <span className="text-xs text-gray-500 dark:text-gray-400">(Déroulant)</span>
                      </label>
                      <div className="relative">
                        <select
                          name="etatChantier"
                          value={formData.etatChantier}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            etatChantier: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none"
                        >
                          <option value="En préparation">En préparation</option>
                          <option value="En cours">En cours</option>
                          <option value="Terminé">Terminé</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 mb-6">
                  <h2 className="text-lg font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    Détails du chantier
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Adresse du chantier
                      </label>
                      <input
                        type="text"
                        name="adresseChantier"
                        value={formData.adresseChantier}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          adresseChantier: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Durée (en jours ouvrables)
                      </label>
                      <input
                        type="number"
                        name="dureeEnJours"
                        id="dureeEnJours"
                        min="1"
                        value={formData.dureeEnJours}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          dureeEnJours: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/chantiers/${params.chantierId}/etats`)}
                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-blue-700 hover:border-blue-500 dark:border-blue-600 dark:hover:border-blue-500"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span>Enregistrer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 