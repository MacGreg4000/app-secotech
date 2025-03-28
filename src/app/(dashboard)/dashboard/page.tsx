'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import {
  ChartBarIcon,
  CurrencyEuroIcon,
  WrenchIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MapIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  HomeModernIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import UserNotepad from '@/components/dashboard/UserNotepad'

// Charger dynamiquement la carte leaflet uniquement côté client
const DynamicMap = dynamic(() => Promise.resolve(() => <div>Map Placeholder</div>), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 flex items-center justify-center">Chargement de la carte...</div>
})

// Enregistrer les composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

// Types pour les données du dashboard
interface DashboardStats {
  // Métriques financières
  chiffreAffairesTotal: number
  depensesMoisEnCours: number
  margeGlobale: number
  
  // Métriques chantiers
  nombreChantiersActifs: number
  tauxCompletionMoyen: number
  montantChantiersPreperation: number
  montantChantiersEnCours: number
  
  // Métriques ressources
  nombreMachinesPretees: number
  totalMachines: number
  documentsARenouveler: number
}

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string
    fill?: boolean
  }[]
}

interface Chantier {
  id: string
  nom: string
  etat: string
  montant: number
  progression: number
  client: string
  latitude?: number
  longitude?: number
  marge?: number
}

interface SousTraitant {
  id: string
  nom: string
  montantEngage: number
  performance: number
  etatsEnAttente: number
}

interface Machine {
  id: string
  nom: string
  statut: string
  tauxUtilisation: number
  prochainesMaintenance?: Date
}

interface Pret {
  id: string
  machineName: string
  emprunteur: string
  dateRetour: string
  isLate: boolean
}

interface Document {
  id: string
  nom: string
  type: string
  date: string
  createdBy: string
}

interface Alerte {
  id: string
  type: string
  message: string
  date: string
  severity: 'low' | 'medium' | 'high'
}

export default function Dashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [prets, setPrets] = useState<Pret[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [rapports, setRapports] = useState<Document[]>([])
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [sousTraitants, setSousTraitants] = useState<SousTraitant[]>([])
  const [evolutionCA, setEvolutionCA] = useState<ChartData | null>(null)
  const [repartitionChantiers, setRepartitionChantiers] = useState<ChartData | null>(null)
  const [isNotepadOpen, setIsNotepadOpen] = useState(false)

  useEffect(() => {
    // Fonction pour charger toutes les données du dashboard
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        // Récupérer les statistiques générales
        const statsResponse = await fetch('/api/dashboard/stats')
        if (!statsResponse.ok) {
          throw new Error('Erreur lors de la récupération des statistiques')
        }
        const statsData = await statsResponse.json()
        setStats(statsData)
        
        // Récupérer les chantiers récents avec leurs coordonnées
        const chantiersResponse = await fetch('/api/dashboard/chantiers')
        if (!chantiersResponse.ok) {
          throw new Error('Erreur lors de la récupération des chantiers')
        }
        const chantiersData = await chantiersResponse.json()
        setChantiers(chantiersData)
        
        // Récupérer les données des machines et prêts
        const machinesResponse = await fetch('/api/dashboard/machines')
        if (!machinesResponse.ok) {
          throw new Error('Erreur lors de la récupération des machines')
        }
        const machinesData = await machinesResponse.json()
        setMachines(machinesData.machineStats)
        setPrets(machinesData.prets)
        
        // Récupérer les documents et rapports
        const documentsResponse = await fetch('/api/dashboard/documents')
        if (!documentsResponse.ok) {
          throw new Error('Erreur lors de la récupération des documents')
        }
        const documentsData = await documentsResponse.json()
        setDocuments(documentsData.documents)
        setRapports(documentsData.rapports)
        
        // Récupérer les alertes
        const alertesResponse = await fetch('/api/dashboard/alertes')
        if (!alertesResponse.ok) {
          throw new Error('Erreur lors de la récupération des alertes')
        }
        const alertesData = await alertesResponse.json()
        setAlertes(alertesData)

        // Récupérer les données des sous-traitants
        const sousTraitantsResponse = await fetch('/api/dashboard/soustraitants')
        if (!sousTraitantsResponse.ok) {
          throw new Error('Erreur lors de la récupération des sous-traitants')
        }
        const sousTraitantsData = await sousTraitantsResponse.json()
        setSousTraitants(sousTraitantsData)

        // Récupérer l'évolution du CA
        const evolutionResponse = await fetch('/api/dashboard/evolution')
        if (!evolutionResponse.ok) {
          throw new Error('Erreur lors de la récupération de l\'évolution')
        }
        const evolutionData = await evolutionResponse.json()
        setEvolutionCA(evolutionData)

        // Calculer la répartition des chantiers
        const repartition: ChartData = {
          labels: ['En préparation', 'En cours', 'Terminé'],
          datasets: [{
            label: 'Répartition des chantiers',
            data: [
              chantiersData.filter((c: Chantier) => c.etat === 'En préparation').length,
              chantiersData.filter((c: Chantier) => c.etat === 'En cours').length,
              chantiersData.filter((c: Chantier) => c.etat === 'Terminé').length
            ],
            backgroundColor: [
              '#F59E0B', // Jaune pour "En préparation"
              '#10B981', // Vert pour "En cours" 
              '#3B82F6'  // Bleu pour "Terminé"
            ] as string[]
          }]
        }
        setRepartitionChantiers(repartition)
        
      } catch (error) {
        console.error('Erreur lors du chargement des données du dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Fonction pour formater les montants en euros
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant)
  }

  // Fonction pour obtenir la couleur de la sévérité des alertes
  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-2 text-sm text-gray-700">
          Vue d'ensemble de l'activité de l'entreprise
        </p>
      </div>

      {/* Section: Tableau blanc personnel repliable */}
      {session?.user?.id && (
        <div className="mb-8 bg-white overflow-hidden shadow rounded-lg">
          <div 
            className="p-4 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 cursor-pointer"
            onClick={() => setIsNotepadOpen(!isNotepadOpen)}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Notes personnelles
            </h3>
            <button className="p-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800">
              {isNotepadOpen ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
          {isNotepadOpen && (
            <div className="p-4">
              <UserNotepad userId={session.user.id} />
            </div>
          )}
        </div>
      )}

      {/* Section 1: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* KPI 1: Chiffre d'affaires total */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <CurrencyEuroIcon className="h-7 w-7 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Chiffre d'affaires total
                  </dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats && formatMontant(stats.chiffreAffairesTotal)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Marge globale */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <BuildingOffice2Icon className="h-7 w-7 text-red-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Chantiers actifs
                  </dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats && stats.nombreChantiersActifs}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Montant chantiers en préparation */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <CurrencyEuroIcon className="h-7 w-7 text-yellow-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Chiffre d'affaires en préparation
                  </dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats && formatMontant(stats.montantChantiersPreperation)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4: Montant chantiers en cours */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <CurrencyEuroIcon className="h-7 w-7 text-green-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Chiffre d'affaires en cours
                  </dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats && formatMontant(stats.montantChantiersEnCours)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 5: Nombre de chantiers actifs */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <CurrencyEuroIcon className="h-7 w-7 text-indigo-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Marge globale
                  </dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats && `${stats.margeGlobale.toFixed(1)}%`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 6: Taux de réalisation financière */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <ClipboardDocumentListIcon className="h-7 w-7 text-purple-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-base font-medium text-gray-500 truncate">
                    Réalisation financière
                  </dt>
                  <dd>
                    <div className="text-2xl font-semibold text-gray-900 mt-1">
                      {stats && `${stats.tauxCompletionMoyen.toFixed(1)}%`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Graphique principal et alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Graphique d'évolution CA vs Dépenses */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Évolution CA vs Dépenses
          </h3>
          {evolutionCA && (
            <div className="h-80">
              <Line
                data={evolutionCA}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => formatMontant(value as number)
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Alertes prioritaires */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
              Alertes prioritaires
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {alertes
              .filter(alerte => alerte.severity === 'high')
              .map((alerte) => (
                <li key={alerte.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {alerte.message}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(alerte.severity)}`}>
                        {alerte.date}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Type: {alerte.type}
                      </p>
                    </div>
                  </div>
                </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Section 3: Chantiers récents et carte */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Tableau des chantiers */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Chantiers prioritaires
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom du chantier
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    État
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progression
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chantiers
                  .sort((a, b) => b.montant - a.montant)
                  .slice(0, 5)
                  .map((chantier) => (
                    <tr key={chantier.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {chantier.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {chantier.client || 'Client non spécifié'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          chantier.etat === 'En cours' ? 'bg-green-100 text-green-800' : 
                          chantier.etat === 'En préparation' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {chantier.etat}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatMontant(chantier.montant)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${chantier.progression}%` }}
                          ></div>
                        </div>
                        <span className="text-xs mt-1 inline-block">{chantier.progression}%</span>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Répartition des chantiers */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Répartition des chantiers
          </h3>
          {repartitionChantiers && (
            <div className="h-64">
              <Doughnut
                data={repartitionChantiers}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Carte des chantiers */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <MapIcon className="h-5 w-5 text-blue-500 mr-2" />
            Carte des chantiers
          </h3>
        </div>
        <div className="p-4">
          <div className="h-96 rounded-lg overflow-hidden">
            {typeof window !== 'undefined' && (
              <DynamicMap />
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Sous-traitants et Ressources */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
        {/* Sous-traitants */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <UserGroupIcon className="h-5 w-5 text-blue-500 mr-2" />
              Performance des sous-traitants
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant engagé
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    États en attente
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sousTraitants.map((sousTraitant) => (
                  <tr key={sousTraitant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sousTraitant.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatMontant(sousTraitant.montantEngage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            sousTraitant.performance >= 80 ? 'bg-green-600' : 
                            sousTraitant.performance >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${sousTraitant.performance}%` }}
                        ></div>
                      </div>
                      <span className="text-xs mt-1 inline-block">{sousTraitant.performance}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sousTraitant.etatsEnAttente > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {sousTraitant.etatsEnAttente}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ressources - Machines */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <WrenchIcon className="h-5 w-5 text-blue-500 mr-2" />
              Statut des machines
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux d'utilisation
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {machines.map((machine) => (
                  <tr key={machine.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {machine.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        machine.statut === 'DISPONIBLE' ? 'bg-green-100 text-green-800' : 
                        machine.statut === 'PRETE' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {machine.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${machine.tauxUtilisation}%` }}
                        ></div>
                      </div>
                      <span className="text-xs mt-1 inline-block">{machine.tauxUtilisation}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 5: Derniers prêts et rapports */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
        {/* Derniers rapports */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              <DocumentTextIcon className="h-5 w-5 text-blue-500 inline mr-2" />
              Derniers rapports de visite
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {rapports.map((rapport) => (
              <li key={rapport.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-600 truncate">
                    {rapport.nom}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {rapport.date}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      {rapport.createdBy}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Derniers prêts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              <WrenchIcon className="h-5 w-5 text-blue-500 inline mr-2" />
              Derniers prêts de machines
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {prets.map((pret) => (
              <li key={pret.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-600 truncate">
                    {pret.machineName}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      pret.isLate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      Retour: {pret.dateRetour}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Emprunté par: {pret.emprunteur}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Section 6: Alertes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
            Alertes et notifications
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {alertes.map((alerte) => (
            <li key={alerte.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {alerte.message}
                </p>
                <div className="ml-2 flex-shrink-0 flex">
                  <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(alerte.severity)}`}>
                    {alerte.date}
                  </p>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    Type: {alerte.type}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
} 