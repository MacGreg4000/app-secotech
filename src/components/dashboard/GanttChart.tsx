import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isToday from 'dayjs/plugin/isToday'
import 'dayjs/locale/fr'
import { ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Initialiser dayjs
dayjs.extend(weekOfYear)
dayjs.extend(isSameOrBefore)
dayjs.extend(isToday)
dayjs.locale('fr')

// Types
interface Chantier {
  id: string
  title: string
  start: string
  end: string | null
  client: string
  etat: string
  adresse?: string
  montant?: number
  dureeEnJours?: number
}

interface GanttChartProps {
  chantiers: Chantier[]
  loading?: boolean
}

const GanttChart: React.FC<GanttChartProps> = ({ chantiers, loading = false }) => {
  // État pour l'infobulle
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    chantier: Chantier | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    chantier: null,
    position: { x: 0, y: 0 }
  })

  // État pour la période affichée
  const [period, setPeriod] = useState({
    start: dayjs().startOf('month'),
    end: dayjs().add(3, 'month').endOf('month')
  })
  
  // État pour l'échelle de temps
  const [scale, setScale] = useState<'Jours' | 'Semaines' | 'Mois'>('Semaines')
  
  // État pour les filtres
  const [filters, setFilters] = useState({
    'En préparation': true,
    'En cours': true,
    'Terminé': true
  })
  
  // Gérer le changement d'échelle
  useEffect(() => {
    const now = dayjs()
    
    switch(scale) {
      case 'Jours':
        setPeriod({
          start: now.subtract(2, 'day').startOf('day'),
          end: now.add(12, 'day').endOf('day')
        })
        break
      case 'Semaines':
        setPeriod({
          start: now.startOf('month'),
          end: now.add(3, 'month').endOf('month')
        })
        break
      case 'Mois':
        setPeriod({
          start: now.subtract(1, 'month').startOf('month'),
          end: now.add(6, 'month').endOf('month')
        })
        break
    }
  }, [scale])
  
  // Calculer les divisions de temps selon l'échelle
  const timeUnits = React.useMemo(() => {
    const result = []
    let current: dayjs.Dayjs
    
    switch(scale) {
      case 'Jours':
        current = period.start.clone()
        while (current.isBefore(period.end) || current.isSame(period.end, 'day')) {
          result.push({
            start: current.clone(),
            end: current.clone().endOf('day'),
            label: current.format('DD'),
            subLabel: current.format('ddd'),
            isWeekend: [0, 6].includes(current.day())
          })
          current = current.add(1, 'day')
        }
        break
      
      case 'Semaines':
        current = period.start.clone().startOf('week')
        while (current.isBefore(period.end)) {
          result.push({
            start: current.clone(),
            end: current.clone().add(6, 'day'),
            label: `Sem ${current.week()}`,
            subLabel: `${current.format('DD/MM')} - ${current.add(6, 'day').format('DD/MM')}`,
            isWeekend: false
          })
          current = current.add(1, 'week')
        }
        break
      
      case 'Mois':
        current = period.start.clone().startOf('month')
        while (current.isBefore(period.end)) {
          const monthName = current.format('MMM')
          result.push({
            start: current.clone(),
            end: current.clone().endOf('month'),
            label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            subLabel: current.format('YYYY'),
            isWeekend: false
          })
          current = current.add(1, 'month')
        }
        break
    }
    
    return result
  }, [period, scale])

  // Changer de période
  const goToPrevious = () => {
    switch(scale) {
      case 'Jours':
        setPeriod(prev => ({
          start: prev.start.subtract(14, 'day'),
          end: prev.end.subtract(14, 'day')
        }))
        break
      case 'Semaines':
        setPeriod(prev => ({
          start: prev.start.subtract(2, 'month'),
          end: prev.end.subtract(2, 'month')
        }))
        break
      case 'Mois':
        setPeriod(prev => ({
          start: prev.start.subtract(6, 'month'),
          end: prev.end.subtract(6, 'month')
        }))
        break
    }
  }
  
  const goToNext = () => {
    switch(scale) {
      case 'Jours':
        setPeriod(prev => ({
          start: prev.start.add(14, 'day'),
          end: prev.end.add(14, 'day')
        }))
        break
      case 'Semaines':
        setPeriod(prev => ({
          start: prev.start.add(2, 'month'),
          end: prev.end.add(2, 'month')
        }))
        break
      case 'Mois':
        setPeriod(prev => ({
          start: prev.start.add(6, 'month'),
          end: prev.end.add(6, 'month')
        }))
        break
    }
  }
  
  // Filtrer les chantiers selon l'état
  const filteredChantiers = chantiers.filter(
    chantier => filters[chantier.etat as keyof typeof filters]
  )
  
  // Exporter en PDF
  const exportToPDF = async () => {
    const ganttElement = document.getElementById('gantt-chart')
    if (!ganttElement) return
    
    try {
      // Créer conteneur temporaire
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.width = '1200px'
      document.body.appendChild(tempContainer)
      
      // Cloner le contenu
      const clone = ganttElement.cloneNode(true) as HTMLElement
      tempContainer.appendChild(clone)
      
      // Ajouter titre
      const header = document.createElement('div')
      header.innerHTML = `
        <h2 style="font-size: 18px; margin-bottom: 10px">Planning des chantiers</h2>
        <p style="font-size: 12px; color: #666">Exporté le ${dayjs().format('DD/MM/YYYY')}</p>
      `
      tempContainer.insertBefore(header, clone)
      
      // Générer PDF
      const canvas = await html2canvas(tempContainer, { 
        scale: 1.5, 
        backgroundColor: '#ffffff' 
      })
      document.body.removeChild(tempContainer)
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight) * 0.9
      
      pdf.addImage(
        imgData, 
        'PNG', 
        10, 
        10, 
        imgWidth * ratio, 
        imgHeight * ratio
      )
      
      pdf.save('planning-chantiers.pdf')
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error)
    }
  }
  
  // Afficher / masquer l'infobulle
  const showTooltip = (e: React.MouseEvent, chantier: Chantier) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      visible: true,
      chantier,
      position: { 
        x: rect.left + rect.width / 2, 
        y: rect.bottom 
      }
    })
  }
  
  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }
  
  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    )
  }
  
  // Affichage quand pas de chantiers
  if (!chantiers.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-500">Aucun chantier à afficher</div>
      </div>
    )
  }
  
  // Formater la période pour l'affichage
  const periodDisplay = `${period.start.format('DD MMM YYYY')} — ${period.end.format('DD MMM YYYY')}`
  
  const toggleFilter = (filter: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }))
  }
  
  const columnWidth = scale === 'Jours' ? 70 : scale === 'Semaines' ? 120 : 180
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Barre d'outils */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap justify-between items-center">
          {/* Partie gauche: Navigation et période */}
          <div className="flex items-center">
            <button 
              onClick={goToPrevious}
              className="p-1 rounded hover:bg-gray-100" 
              aria-label="Période précédente"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            
            <span className="mx-2 text-sm font-medium">
              {periodDisplay}
            </span>
            
            <button 
              onClick={goToNext} 
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Période suivante"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Partie centrale: Sélecteur d'échelle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
              {(['Jours', 'Semaines', 'Mois'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setScale(option)}
                  className={`px-4 py-2 text-sm ${
                    scale === option
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          
          {/* Partie droite: Filtres et exportation */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {Object.entries(filters).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key as keyof typeof filters)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    value 
                      ? key === 'En préparation'
                        ? 'bg-yellow-100 text-yellow-800'
                        : key === 'En cours'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            
            <button
              onClick={exportToPDF}
              className="flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Exporter
            </button>
          </div>
        </div>
      </div>
      
      {/* Contenu du planning */}
      <div id="gantt-chart" className="overflow-x-auto">
        <div className="min-w-full relative">
          {/* Entête avec les unités de temps */}
          <div className="grid" style={{ 
            gridTemplateColumns: `minmax(200px, 1fr) repeat(${timeUnits.length}, ${columnWidth}px)` 
          }}>
            <div className="p-3 font-medium text-sm border-b border-r border-gray-200 bg-gray-100">
              Chantier
            </div>
            
            {timeUnits.map((unit, index) => (
              <div 
                key={index}
                className={`p-3 text-center border-b border-r border-gray-200 ${
                  unit.isWeekend ? 'bg-gray-100' : 'bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium">{unit.label}</div>
                <div className="text-xs text-gray-500">{unit.subLabel}</div>
              </div>
            ))}
          </div>
          
          {/* Corps du tableau avec chantiers */}
          {filteredChantiers.map((chantier) => {
            const start = dayjs(chantier.start)
            const end = chantier.end ? dayjs(chantier.end) : start.add(30, 'day')
            
            // Calculer positionnement pour la barre
            const startUnitIndex = timeUnits.findIndex(unit => 
              (start.isAfter(unit.start) || start.isSame(unit.start, 'day')) && 
              (start.isBefore(unit.end) || start.isSame(unit.end, 'day'))
            )
            
            const endUnitIndex = timeUnits.findIndex(unit => 
              (end.isAfter(unit.start) || end.isSame(unit.start, 'day')) && 
              (end.isBefore(unit.end) || end.isSame(unit.end, 'day'))
            )
            
            // Si hors période visible
            if (startUnitIndex === -1 && endUnitIndex === -1) {
              if (start.isAfter(timeUnits[timeUnits.length - 1].end) || end.isBefore(timeUnits[0].start)) {
                return null // Hors période, ne pas afficher
              }
            }
            
            const effectiveStartIndex = startUnitIndex === -1 ? 0 : startUnitIndex
            const effectiveEndIndex = endUnitIndex === -1 ? timeUnits.length - 1 : endUnitIndex
            
            return (
              <div 
                key={chantier.id} 
                className="grid items-center relative" 
                style={{ 
                  gridTemplateColumns: `minmax(200px, 1fr) repeat(${timeUnits.length}, ${columnWidth}px)`,
                  height: '72px'
                }}
              >
                {/* Info chantier */}
                <div className="p-3 border-b border-r border-gray-200">
                  <div className="text-sm font-medium">{chantier.title}</div>
                  <div className="text-xs text-gray-500">{chantier.client}</div>
                  <div className="text-xs text-gray-400">
                    {dayjs(chantier.start).format('DD/MM/YY')} - {chantier.end ? dayjs(chantier.end).format('DD/MM/YY') : '?'}
                  </div>
                </div>
                
                {/* Cellules unités de temps */}
                {timeUnits.map((unit, index) => (
                  <div 
                    key={index} 
                    className={`border-b border-r border-gray-200 h-full ${
                      unit.isWeekend ? 'bg-gray-50' : ''
                    }`} 
                  />
                ))}
                
                {/* Barre du chantier */}
                {(startUnitIndex !== -1 || endUnitIndex !== -1) && (
                  <div
                    className={`absolute h-8 rounded shadow-sm cursor-pointer hover:opacity-90 ${
                      chantier.etat === 'En préparation'
                        ? 'bg-yellow-500'
                        : chantier.etat === 'En cours'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                    }`}
                    style={{
                      left: `calc(200px + ${effectiveStartIndex * columnWidth}px + 8px)`,
                      width: `calc(${(effectiveEndIndex - effectiveStartIndex + 1) * columnWidth - 16}px)`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                    onMouseEnter={(e) => showTooltip(e, chantier)}
                    onMouseLeave={hideTooltip}
                  >
                    <div className="h-full flex items-center justify-center px-2">
                      <span className="text-xs font-medium text-white truncate">
                        {chantier.title}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Infobulle flottante */}
      {tooltip.visible && tooltip.chantier && (
        <div 
          className="fixed bg-white shadow-xl rounded-md p-4 w-72 border border-gray-200 z-[1000]"
          style={{
            left: `${tooltip.position.x}px`,
            top: `${tooltip.position.y + 8}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-medium text-base mb-2">{tooltip.chantier.title}</div>
          <div className="text-sm text-gray-500 mb-3">{tooltip.chantier.client}</div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="font-medium text-gray-600">Période</div>
              <div>{dayjs(tooltip.chantier.start).format('DD/MM/YYYY')} - {tooltip.chantier.end ? dayjs(tooltip.chantier.end).format('DD/MM/YYYY') : 'Non défini'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-600">Durée</div>
              <div>{tooltip.chantier.dureeEnJours || dayjs(tooltip.chantier.end || '').diff(dayjs(tooltip.chantier.start), 'day')} jours</div>
            </div>
            <div>
              <div className="font-medium text-gray-600">État</div>
              <div>{tooltip.chantier.etat}</div>
            </div>
            <div>
              <div className="font-medium text-gray-600">Montant</div>
              <div>{tooltip.chantier.montant ? `${tooltip.chantier.montant.toLocaleString('fr-FR')} €` : 'Non défini'}</div>
            </div>
            {tooltip.chantier.adresse && (
              <div className="col-span-2">
                <div className="font-medium text-gray-600">Adresse</div>
                <div>{tooltip.chantier.adresse}</div>
              </div>
            )}
          </div>
          
          {/* Flèche du tooltip */}
          <div className="absolute h-3 w-3 bg-white transform rotate-45 border-t border-l border-gray-200"
               style={{ top: '-6px', left: '50%', marginLeft: '-6px' }}></div>
        </div>
      )}
    </div>
  )
}

export default GanttChart 