'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { 
  BriefcaseIcon, 
  BanknotesIcon, 
  BuildingOfficeIcon, 
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

// Components
import UserNotepad from '@/components/dashboard/UserNotepad'
import KPICard from '@/components/dashboard/KPICard'
import ChantiersStatsChart from '@/components/dashboard/ChantiersStatsChart'
import BonsRegieWidget from '@/components/dashboard/BonsRegieWidget'
import DocumentsExpiresWidget from '@/components/dashboard/DocumentsExpiresWidget'
import SimpleChantiersMap from '@/components/dashboard/SimpleChantiersMap'
import SimpleMapNas from '@/components/dashboard/SimpleMapNas'

// Types
interface DashboardStats {
  chiffreAffairesTotal: number
  nombreChantiersActifs: number
  montantChantiersPreperation: number
  montantChantiersEnCours: number
}

interface ChantierMapData {
  id: string
  nom: string
  client: string
  etat: string
  montant: number
  progression: number
  adresse?: string
  adresseChantier?: string
  latitude?: number
  longitude?: number
}

// Désactiver le pré-rendu
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [chantiersMap, setChantiersMap] = useState<ChantierMapData[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chantiersByCategory, setChantiersByCategory] = useState<{
    enPreparation: number
    enCours: number
    termines: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Formater les montants en euros
  const formatEuros = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Récupérer les données pour le dashboard
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Récupérer les chantiers pour la carte
        const mapDataResponse = await fetch('/api/dashboard/chantiers')
        const mapData = await mapDataResponse.json()
        setChantiersMap(mapData)

        // Récupérer les statistiques
        const statsResponse = await fetch('/api/dashboard/stats')
        const statsData = await statsResponse.json()
        setStats(statsData)

        // Récupérer les données de chantiers pour le graphique
        const chantiersResponse = await fetch('/api/chantiers')
        const chantiersData = await chantiersResponse.json()
        
        // Calculer la répartition des chantiers par catégorie pour le graphique
        const enPreparation = chantiersData.filter((c: any) => c.etatChantier === 'En préparation').length
        const enCours = chantiersData.filter((c: any) => c.etatChantier === 'En cours').length
        const termines = chantiersData.filter((c: any) => c.etatChantier === 'Terminé').length
        
        setChantiersByCategory({
          enPreparation,
          enCours,
          termines
        })
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err)
        setError('Erreur lors du chargement des données du dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (error) {
    return (
      <div className="p-8 text-red-600 dark:text-red-400">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Rafraîchir la page
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Tableau de bord</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Mon tableau blanc */}
        <div className="lg:col-span-2">
          <UserNotepad userId={session?.user?.id || 'anonymous'} />
        </div>
        
        {/* Répartition des chantiers */}
        <div>
          <ChantiersStatsChart data={chantiersByCategory} loading={loading} />
        </div>
      </div>
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KPICard
          title="Chantiers actifs"
          value={stats?.nombreChantiersActifs || 0}
          subtitle="En cours et en préparation"
          icon={<BriefcaseIcon className="h-8 w-8" />}
          loading={loading}
        />
        <KPICard
          title="Chiffre d'affaires"
          value={stats ? formatEuros(stats.chiffreAffairesTotal) : '0 €'}
          subtitle="Total de tous les chantiers"
          icon={<BanknotesIcon className="h-8 w-8" />}
          loading={loading}
        />
        <KPICard
          title="Chantiers en préparation"
          value={stats ? formatEuros(stats.montantChantiersPreperation) : '0 €'}
          subtitle="Montant total"
          icon={<ClockIcon className="h-8 w-8" />}
          loading={loading}
        />
        <KPICard
          title="Chantiers en cours"
          value={stats ? formatEuros(stats.montantChantiersEnCours) : '0 €'}
          subtitle="Montant total"
          icon={<BuildingOfficeIcon className="h-8 w-8" />}
          loading={loading}
        />
      </div>
      
      {/* Liste des chantiers */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Liste des chantiers</h2>
          {loading ? (
            <p>Chargement des chantiers...</p>
          ) : (
            <div className="space-y-4">
              {chantiersMap.map((chantier) => (
                <div key={chantier.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{chantier.nom}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{chantier.client}</p>
                    </div>
                    <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {chantier.etat}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    <span>{chantier.adresse || chantier.adresseChantier || 'Adresse non spécifiée'}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatEuros(chantier.montant)}
                    </span>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                      • Progression: {chantier.progression}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Localisation des chantiers (SimpleMapNas) */}
      <div className="mb-6">
        <SimpleMapNas chantiers={chantiersMap} loading={loading} />
      </div>

      {/* Documents à surveiller */}
      <div className="mb-6">
        <DocumentsExpiresWidget />
      </div>

      {/* Bons de régie */}
      <div className="mb-6">
        <BonsRegieWidget />
      </div>
    </div>
  )
} 