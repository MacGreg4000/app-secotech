'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { type Chantier } from '@/types/chantier'
import { FormInput, FormTextarea, Button } from '@/components/ui'

interface Client {
  id: string
  nom: string
  email: string | null
  adresse: string | null
  telephone: string | null
  chantier: Array<{
    chantierId: string
    nomChantier: string
    dateCommencement: string
    etatChantier: string
    montantTotal: number
  }>
}

export default function EditClientPage({ params }: { params: { clientId: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    fetch(`/api/clients/${params.clientId}`)
      .then(res => res.json())
      .then(data => {
        setClient(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Erreur:', error)
        setError('Erreur lors de la récupération du client')
        setLoading(false)
      })
  }, [params.clientId, session])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/clients/${params.clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(client)
      })

      if (!response.ok) throw new Error('Erreur lors de la mise à jour')
      
      router.push('/clients')
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la mise à jour du client')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setClient(prev => prev ? ({
      ...prev,
      [name]: value
    }) : null)
  }

  if (!session) {
    return <div className="p-8 text-red-600">Veuillez vous connecter pour accéder à cette page</div>
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-600">Erreur: {error}</div>
  if (!client) return <div className="p-8">Client non trouvé</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Formulaire d'édition */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <h2 className="text-xl font-bold dark:text-white">Informations du client</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormInput
                id="nom"
                name="nom"
                type="text"
                label="Nom du client"
                value={client.nom}
                onChange={handleChange}
                required
              />

              <FormInput
                id="email"
                name="email"
                type="email"
                label="Email"
                value={client.email || ''}
                onChange={handleChange}
              />

              <FormInput
                id="telephone"
                name="telephone"
                type="tel"
                label="Téléphone"
                value={client.telephone || ''}
                onChange={handleChange}
              />

              <FormTextarea
                id="adresse"
                name="adresse"
                label="Adresse"
                value={client.adresse || ''}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/clients')}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                isLoading={saving}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </div>

        {/* Historique des chantiers */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Historique des chantiers</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nom du chantier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date de commencement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      État
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {client.chantier?.map((chantier) => (
                    <tr key={chantier.chantierId}>
                      <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">
                        {chantier.nomChantier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">
                        {new Date(chantier.dateCommencement).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusStyle(chantier.etatChantier)}`}>
                          {chantier.etatChantier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">
                        {chantier.montantTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/chantiers/${chantier.chantierId}/notes`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Voir le chantier
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'En cours':
      return 'bg-green-100 text-green-800'
    case 'Terminé':
      return 'bg-gray-100 text-gray-800'
    case 'En préparation':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-600'
  }
} 