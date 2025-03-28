'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { 
  CalendarIcon, 
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

// Types pour les données du planning
interface Chantier {
  id: string
  nom: string
  client: string
  etat: string
  dateCommencement: string
  dureeEnJours: number
}

export default function Planning() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [filtreEtat, setFiltreEtat] = useState<string[]>(['En préparation', 'En cours'])
  const [error, setError] = useState<string | null>(null)
  
  // Calculer la date de début et de fin pour l'échelle de temps
  const [dateDebut, setDateDebut] = useState<Date>(new Date())
  const [dateFin, setDateFin] = useState<Date>(new Date())
  const [echelle, setEchelle] = useState<'jours' | 'semaines' | 'mois'>('semaines')
  const [menuEchelleOuvert, setMenuEchelleOuvert] = useState(false)
  
  // Référence pour le conteneur du diagramme (pour le scroll)
  const diagrammeRef = useRef<HTMLDivElement>(null)
  
  // Période visible (pour la navigation)
  const [periodeDebut, setPeriodeDebut] = useState<Date>(new Date())
  const [periodeFin, setPeriodeFin] = useState<Date>(new Date())
  
  // Nombre de semaines à afficher à la fois
  const SEMAINES_VISIBLES = 20
  
  useEffect(() => {
    fetchChantiers()
  }, [])
  
  const fetchChantiers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/planning/chantiers')
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des chantiers')
      }
      
      const data = await response.json()
      setChantiers(data)
      
      // Calculer la plage de dates pour l'affichage
      if (data.length > 0) {
        const dates = data.map((c: Chantier) => new Date(c.dateCommencement))
        const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())))
        
        // Calculer la date de fin en fonction de la durée maximale
        const maxEndDate = data.reduce((max: Date, c: Chantier) => {
          const startDate = new Date(c.dateCommencement)
          const endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + c.dureeEnJours)
          return endDate > max ? endDate : max
        }, new Date())
        
        // Ajouter une marge de 7 jours avant et après
        minDate.setDate(minDate.getDate() - 7)
        maxEndDate.setDate(maxEndDate.getDate() + 7)
        
        setDateDebut(minDate)
        setDateFin(maxEndDate)
        
        // Initialiser la période visible (20 semaines à partir de la date de début)
        const finPeriodeInitiale = new Date(minDate)
        finPeriodeInitiale.setDate(minDate.getDate() + (SEMAINES_VISIBLES * 7))
        setPeriodeDebut(minDate)
        setPeriodeFin(finPeriodeInitiale)
      }
    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible de charger les chantiers. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }
  
  const toggleFiltre = (etat: string) => {
    if (filtreEtat.includes(etat)) {
      setFiltreEtat(filtreEtat.filter(e => e !== etat))
    } else {
      setFiltreEtat([...filtreEtat, etat])
    }
  }
  
  // Trier les chantiers par date de commencement et filtrer par état
  const chantiersFiltered = chantiers
    .filter(chantier => filtreEtat.includes(chantier.etat))
    .sort((a, b) => {
      const dateA = new Date(a.dateCommencement).getTime();
      const dateB = new Date(b.dateCommencement).getTime();
      return dateA - dateB;
    });
  
  // Navigation dans le temps
  const naviguerAvant = () => {
    const nouvellePeriodeDebut = new Date(periodeDebut)
    const nouvellePeriodeFin = new Date(periodeFin)
    
    // Avancer de 4 semaines (environ 1 mois)
    nouvellePeriodeDebut.setDate(nouvellePeriodeDebut.getDate() + 28)
    nouvellePeriodeFin.setDate(nouvellePeriodeFin.getDate() + 28)
    
    // Ne pas dépasser la date de fin globale
    if (nouvellePeriodeFin > dateFin) {
      nouvellePeriodeFin.setTime(dateFin.getTime())
      nouvellePeriodeDebut.setTime(nouvellePeriodeFin.getTime() - (SEMAINES_VISIBLES * 7 * 24 * 60 * 60 * 1000))
    }
    
    setPeriodeDebut(nouvellePeriodeDebut)
    setPeriodeFin(nouvellePeriodeFin)
  }
  
  const naviguerArriere = () => {
    const nouvellePeriodeDebut = new Date(periodeDebut)
    const nouvellePeriodeFin = new Date(periodeFin)
    
    // Reculer de 4 semaines (environ 1 mois)
    nouvellePeriodeDebut.setDate(nouvellePeriodeDebut.getDate() - 28)
    nouvellePeriodeFin.setDate(nouvellePeriodeFin.getDate() - 28)
    
    // Ne pas dépasser la date de début globale
    if (nouvellePeriodeDebut < dateDebut) {
      nouvellePeriodeDebut.setTime(dateDebut.getTime())
      nouvellePeriodeFin.setTime(nouvellePeriodeDebut.getTime() + (SEMAINES_VISIBLES * 7 * 24 * 60 * 60 * 1000))
    }
    
    setPeriodeDebut(nouvellePeriodeDebut)
    setPeriodeFin(nouvellePeriodeFin)
  }
  
  // Générer l'échelle de temps pour la période visible
  const genererEchelle = () => {
    if (!periodeDebut || !periodeFin) return []
    
    const echelleDates: Date[] = []
    const currentDate = new Date(periodeDebut)
    
    while (currentDate <= periodeFin) {
      echelleDates.push(new Date(currentDate))
      
      // Incrémenter selon l'échelle choisie
      if (echelle === 'jours') {
        currentDate.setDate(currentDate.getDate() + 1)
      } else if (echelle === 'semaines') {
        currentDate.setDate(currentDate.getDate() + 7)
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1)
      }
    }
    
    return echelleDates
  }
  
  const echelleDates = genererEchelle()
  
  // Calculer la position et la largeur d'une barre de Gantt
  const calculerPositionBarre = (dateDebutStr: string, duree: number) => {
    const dateDebutChantier = new Date(dateDebutStr)
    const dateFinChantier = new Date(dateDebutChantier)
    dateFinChantier.setDate(dateDebutChantier.getDate() + duree)
    
    // Si le chantier est complètement en dehors de la période visible, ne pas l'afficher
    if (dateFinChantier < periodeDebut || dateDebutChantier > periodeFin) {
      return { display: 'none' }
    }
    
    // Calculer le décalage par rapport au début de la période visible (en jours)
    const diffDebut = Math.max(0, (dateDebutChantier.getTime() - periodeDebut.getTime()) / (1000 * 60 * 60 * 24))
    
    // Calculer la largeur (en jours)
    const largeur = Math.min(
      duree,
      (periodeFin.getTime() - dateDebutChantier.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    // Convertir en pourcentage de la largeur totale de la période visible
    const totalDays = (periodeFin.getTime() - periodeDebut.getTime()) / (1000 * 60 * 60 * 24)
    const positionPct = (diffDebut / totalDays) * 100
    const largeurPct = (largeur / totalDays) * 100
    
    return {
      left: `${positionPct}%`,
      width: `${largeurPct}%`
    }
  }
  
  // Formater une date pour l'affichage
  const formaterDate = (date: Date) => {
    if (echelle === 'jours') {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    } else if (echelle === 'semaines') {
      // Calculer le numéro de semaine de l'année
      const start = new Date(date.getFullYear(), 0, 1)
      const diff = date.getTime() - start.getTime()
      const oneWeek = 1000 * 60 * 60 * 24 * 7
      const weekNumber = Math.ceil((diff / oneWeek) + 1)
      return `Sem ${weekNumber} - ${date.toLocaleDateString('fr-FR', { month: 'short' })}`
    } else {
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    }
  }
  
  // Obtenir la couleur en fonction de l'état du chantier
  const getColorByState = (etat: string) => {
    switch (etat) {
      case 'En préparation':
        return 'bg-yellow-500'
      case 'En cours':
        return 'bg-blue-500'
      case 'Terminé':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }
  
  // Formater la période visible pour l'affichage
  const formaterPeriodeVisible = () => {
    const debut = periodeDebut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    const fin = periodeFin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${debut} - ${fin}`
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CalendarIcon className="h-8 w-8 mr-2 text-blue-500" />
            Planning des chantiers
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Vue d'ensemble des chantiers dans le temps
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => fetchChantiers()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Actualiser
          </button>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuEchelleOuvert(!menuEchelleOuvert)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
              Échelle: {echelle === 'jours' ? 'Jours' : echelle === 'semaines' ? 'Semaine' : 'Mois'}
            </button>
            
            {menuEchelleOuvert && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button 
                    onClick={() => {
                      setEchelle('jours')
                      setMenuEchelleOuvert(false)
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Jours
                  </button>
                  <button 
                    onClick={() => {
                      setEchelle('semaines')
                      setMenuEchelleOuvert(false)
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Semaines
                  </button>
                  <button 
                    onClick={() => {
                      setEchelle('mois')
                      setMenuEchelleOuvert(false)
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Mois
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Filtres */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Filtrer par état</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => toggleFiltre('En préparation')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              filtreEtat.includes('En préparation')
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            En préparation
          </button>
          <button
            onClick={() => toggleFiltre('En cours')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              filtreEtat.includes('En cours')
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => toggleFiltre('Terminé')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              filtreEtat.includes('Terminé')
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Terminé
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation temporelle */}
      <div className="mb-4 flex justify-between items-center">
        <button 
          onClick={naviguerArriere}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={periodeDebut <= dateDebut}
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Précédent
        </button>
        
        <div className="text-sm font-medium text-gray-700">
          {formaterPeriodeVisible()}
        </div>
        
        <button 
          onClick={naviguerAvant}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={periodeFin >= dateFin}
        >
          Suivant
          <ChevronRightIcon className="h-4 w-4 ml-1" />
        </button>
      </div>
      
      {/* Diagramme de Gantt */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* En-tête avec échelle de temps */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <div className="w-64 flex-shrink-0 bg-gray-50 p-4 border-r border-gray-200">
              <h3 className="text-sm font-medium text-gray-500">Chantier</h3>
            </div>
            <div className="flex-grow overflow-x-auto" ref={diagrammeRef}>
              <div className="flex h-12">
                {echelleDates.map((date, index) => (
                  <div 
                    key={index} 
                    className="flex-shrink-0 px-2 py-3 text-xs font-medium text-gray-500 border-r border-gray-200 text-center"
                    style={{ width: `${100 / echelleDates.length}%` }}
                  >
                    {formaterDate(date)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Corps du diagramme */}
        <div>
          {chantiersFiltered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun chantier ne correspond aux critères de filtrage.
            </div>
          ) : (
            chantiersFiltered.map((chantier) => (
              <div key={chantier.id} className="flex border-b border-gray-200 hover:bg-gray-50">
                <div className="w-64 flex-shrink-0 p-4 border-r border-gray-200">
                  <div className="font-medium text-gray-900">{chantier.nom}</div>
                  <div className="text-sm text-gray-500">{chantier.client}</div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      chantier.etat === 'En cours' 
                        ? 'bg-blue-100 text-blue-800' 
                        : chantier.etat === 'En préparation'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {chantier.etat}
                    </span>
                  </div>
                </div>
                <div className="flex-grow relative h-20 overflow-hidden">
                  <div 
                    className={`absolute top-2 h-16 rounded-md ${getColorByState(chantier.etat)} opacity-80 shadow-sm`}
                    style={calculerPositionBarre(chantier.dateCommencement, chantier.dureeEnJours)}
                  >
                    <div className="px-2 py-1 text-xs font-medium text-white truncate">
                      {chantier.nom} ({chantier.dureeEnJours}j)
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Légende */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Légende</h3>
        <div className="flex space-x-6">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">En préparation</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">En cours</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Terminé</span>
          </div>
        </div>
      </div>
    </div>
  )
} 