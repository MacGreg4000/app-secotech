'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { 
  BriefcaseIcon, 
  BanknotesIcon, 
  BuildingOfficeIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline'

// Components
import UserNotepad from '@/components/dashboard/UserNotepad'
import KPICard from '@/components/dashboard/KPICard'
import DynamicChantiersMap from '@/components/dashboard/DynamicChantiersMap'
import ChantiersStatsChart from '@/components/dashboard/ChantiersStatsChart'
import BonsRegieWidget from '@/components/dashboard/BonsRegieWidget'
import DocumentsExpiresWidget from '@/components/dashboard/DocumentsExpiresWidget'

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
      
      {/* Carte des chantiers */}
      <div className="mb-6">
        <DynamicChantiersMap chantiers={chantiersMap} loading={loading} />
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