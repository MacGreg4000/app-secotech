'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FormInput, Button, SearchInput } from '@/components/ui'
import { PencilSquareIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'

interface Client {
  id: string
  nom: string
  email: string | null
  adresse: string | null
  telephone: string | null
  chantiers: Array<{
    chantierId: string
    nomChantier: string
    dateCommencement: string
    etatChantier: string
    montantTotal: number
  }>
}

export default function ClientsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [filtreNom, setFiltreNom] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    fetch('/api/clients')
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Erreur lors de la récupération des clients')
        }
        return data
      })
      .then(data => {
        if (Array.isArray(data)) {
          setClients(data)
        } else {
          throw new Error('Format de données invalide')
        }
      })
      .catch(error => {
        console.error('Erreur:', error)
        setError(error.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [session])

  // Filtrage des clients par nom
  const clientsFiltres = clients.filter(client =>
    client.nom.toLowerCase().includes(filtreNom.toLowerCase())
  )

  // Fonction pour créer un nouveau chantier à partir d'un client
  const handleCreateChantier = (clientId: string, clientNom: string) => {
    router.push(`/chantiers/nouveau?clientId=${clientId}&clientNom=${encodeURIComponent(clientNom)}`);
  };

  if (!session) {
    return <div className="p-8 text-red-600">Veuillez vous connecter pour accéder à cette page</div>
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-600">Erreur: {error}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Annuaire des clients</h1>
        <Link href="/clients/nouveau">
          <Button variant="primary">
            Nouveau client
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <SearchInput
          id="search"
          placeholder="Rechercher un client..."
          value={filtreNom}
          onChange={(e) => setFiltreNom(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Aucun client trouvé
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {clientsFiltres.map((client) => (
                <tr key={client.id}>
                  <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">{client.nom}</td>
                  <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap dark:text-gray-200">{client.telephone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/clients/${client.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleCreateChantier(client.id, client.nom)}
                        className="text-green-600 hover:text-green-900"
                        title="Créer un nouveau chantier"
                      >
                        <BuildingOfficeIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
} 