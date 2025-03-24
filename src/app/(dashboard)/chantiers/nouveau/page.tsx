'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import SelectField from '@/components/ui/SelectField'

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

export default function NouveauChantierPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    nomChantier: '',
    dateCommencement: '',
    etatChantier: 'En préparation',
    adresseChantier: '',
    dureeEnJours: '',
    clientId: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) return

    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients')
        const data = await response.json()
        const sortedClients = data.sort((a: Client, b: Client) => 
          a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
        )
        setClients(sortedClients)
        
        const urlParams = new URLSearchParams(window.location.search);
        const clientIdFromUrl = urlParams.get('clientId');
        const clientNomFromUrl = urlParams.get('clientNom');
        
        if (clientIdFromUrl) {
          setSelectedClientId(clientIdFromUrl);
          
          const selectedClient = sortedClients.find((client: Client) => client.id === clientIdFromUrl);
          if (selectedClient) {
            setFormData(prev => ({
              ...prev,
              clientId: selectedClient.id
            }));
          } else if (clientNomFromUrl) {
            setFormData(prev => ({
              ...prev,
              nomChantier: decodeURIComponent(clientNomFromUrl)
            }));
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des clients:', error)
        setError('Erreur lors du chargement des clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [session])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const selectedClient = clients.find(client => client.id === selectedClientId)

      const response = await fetch('/api/chantiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nomChantier: formData.nomChantier,
          dateCommencement: formData.dateCommencement,
          etatChantier: formData.etatChantier,
          adresseChantier: formData.adresseChantier,
          dureeEnJours: formData.dureeEnJours,
          clientId: selectedClientId,
          clientNom: selectedClient?.nom || null,
          clientEmail: selectedClient?.email || null,
          clientAdresse: selectedClient?.adresse || null,
        }),
      })

      if (!response.ok) throw new Error('Erreur lors de la création')

      router.push('/chantiers')
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la création du chantier')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4">Chargement...</div>
  if (error) return <div className="p-4 text-red-500">{error}</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Nouveau chantier</h1>
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
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
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <SelectField
              label="Client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              required
              className="mt-1"
            >
              <option value="">Sélectionner un client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom}
                </option>
              ))}
            </SelectField>

            <div>
              <label className="block text-sm font-medium text-gray-700">
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
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <SelectField
              label="État du chantier"
              name="etatChantier"
              value={formData.etatChantier}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                etatChantier: e.target.value
              }))}
              className="mt-1"
            >
              <option value="En préparation">En préparation</option>
              <option value="En cours">En cours</option>
              <option value="Terminé">Terminé</option>
            </SelectField>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Durée (en jours)
              </label>
              <input
                type="number"
                name="dureeEnJours"
                value={formData.dureeEnJours}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  dureeEnJours: e.target.value
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Localisation du chantier
              </h3>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Adresse du chantier
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    name="adresseChantier"
                    value={formData.adresseChantier}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      adresseChantier: e.target.value
                    }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/chantiers')}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Création...' : 'Créer le chantier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 