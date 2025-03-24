'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { type Chantier } from '@/types/chantier'
import ChantierActions from '@/components/chantier/ChantierActions'
import { 
  MagnifyingGlassIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { SearchInput } from '@/components/ui'
import SelectField from '@/components/ui/SelectField'

function getStatusStyle(status: string) {
  console.log('État reçu:', status)
  switch (status) {
    case 'En cours':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'Terminé':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    case 'En préparation':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

export default function ChantiersPage() {
  const router = useRouter()
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [filtreNom, setFiltreNom] = useState('')
  const [filtreEtat, setFiltreEtat] = useState('En cours')

  useEffect(() => {
    fetch('/api/chantiers')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          console.error('Les données reçues ne sont pas un tableau:', data)
          setChantiers([])
          return
        }
        setChantiers(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Erreur:', error)
        setChantiers([])
        setLoading(false)
      })
  }, [])

  const chantiersFiltrés = chantiers.filter(chantier => {
    const matchNom = chantier.nomChantier.toLowerCase().includes(filtreNom.toLowerCase())
    const matchEtat = filtreEtat === '' || chantier.etatChantier === filtreEtat
    return matchNom && matchEtat
  })

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DocumentExpirationAlert />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Liste des chantiers</h1>
        <div className="flex space-x-3">
          <Link
            href="/planning"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 flex items-center"
          >
            <CalendarIcon className="h-5 w-5 mr-2" />
            Planning
          </Link>
          <Link
            href="/chantiers/nouveau"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            Nouveau chantier
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="w-full">
          <SearchInput
            id="search"
            placeholder="Rechercher par nom..."
            value={filtreNom}
            onChange={(e) => setFiltreNom(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full">
          <SelectField
            label=""
            value={filtreEtat}
            onChange={(e) => setFiltreEtat(e.target.value)}
            className="h-10"
          >
            <option value="">Tous les états</option>
            <option value="En préparation">En préparation</option>
            <option value="En cours">En cours</option>
            <option value="Terminé">Terminé</option>
          </SelectField>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Chantier</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Client</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">État</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Montant</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Date de début</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Durée</th>
                <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {chantiersFiltrés.map((chantier) => (
                <tr key={chantier.chantierId}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-200">
                    {chantier.nomChantier}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {chantier.clientNom || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusStyle(chantier.etatChantier)}`}>
                      {chantier.etatChantier}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {chantier.montantTotal ? `${chantier.montantTotal.toLocaleString('fr-FR')} €` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {chantier.dateCommencement ? new Date(chantier.dateCommencement).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {chantier.dureeEnJours ? `${chantier.dureeEnJours} jours` : '-'}
                  </td>
                  <td className="whitespace-nowrap py-4 px-3 text-center text-sm font-medium">
                    <ChantierActions chantierId={chantier.chantierId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 