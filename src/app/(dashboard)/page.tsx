'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  PencilIcon, 
  DocumentTextIcon, 
  FolderIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/solid'
import { ChantierStatus, type ChantierStatus as TChantierStatus } from '@/components/ChantierStatus'

interface Chantier {
  id: number
  chantierId: string
  nomChantier: string
  dateCommencement: string
  etatChantier: TChantierStatus
  montantTotal: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/chantiers')
      .then(res => res.json())
      .then(data => {
        console.log('Données reçues:', data)
        setChantiers(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur:', err)
        setError('Erreur lors du chargement des chantiers')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Tableau de bord</h1>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-end mb-4">
              <Link 
                href="/chantiers/nouveau"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Nouveau chantier
              </Link>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date de début
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    État
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chantiers.map((chantier) => (
                  <tr key={chantier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {chantier.nomChantier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(chantier.dateCommencement).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <ChantierStatus 
                        status={chantier.etatChantier as TChantierStatus}
                        chantierId={chantier.chantierId}
                        onStatusChange={(newStatus) => {
                          setChantiers(chantiers.map(c => 
                            c.id === chantier.id 
                              ? { ...c, etatChantier: newStatus }
                              : c
                          ))
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/chantiers/${chantier.chantierId}`}
                          className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                          title="Voir le chantier"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <Link 
                          href={`/chantiers/${chantier.chantierId}/notes`}
                          className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Notes"
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </Link>
                        <Link 
                          href={`/chantiers/${chantier.chantierId}/documents`}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                          title="Documents"
                        >
                          <FolderIcon className="h-5 w-5" />
                        </Link>
                        <Link 
                          href={`/chantiers/${chantier.chantierId}/etats`}
                          className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
                          title="États"
                        >
                          <ClipboardDocumentListIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/chantiers/${chantier.chantierId}/modifier`}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 