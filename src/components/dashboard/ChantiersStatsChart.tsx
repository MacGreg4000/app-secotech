'use client'

import { useState, useEffect } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(ArcElement, Tooltip, Legend)

interface ChantiersByCategoryProps {
  data: {
    enPreparation: number;
    enCours: number;
    termines: number;
  } | null;
  loading?: boolean;
}

export default function ChantiersStatsChart({ 
  data, 
  loading = false 
}: ChantiersByCategoryProps) {
  const [chartData, setChartData] = useState<any>(null)

  useEffect(() => {
    if (data) {
      setChartData({
        labels: ['En préparation', 'En cours', 'Terminés'],
        datasets: [
          {
            data: [data.enPreparation, data.enCours, data.termines],
            backgroundColor: [
              'rgba(255, 206, 86, 0.7)', // Jaune
              'rgba(54, 162, 235, 0.7)', // Bleu
              'rgba(75, 192, 192, 0.7)',  // Vert
            ],
            borderColor: [
              'rgba(255, 206, 86, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
            ],
            borderWidth: 1,
          },
        ],
      })
    }
  }, [data])

  const options = {
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || ''
            const value = context.raw || 0
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = Math.round((value / total) * 100)
            return `${label}: ${value} (${percentage}%)`
          }
        }
      }
    },
    cutout: '60%',
    maintainAspectRatio: false,
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Répartition des chantiers</h3>
      </div>
      
      <div className="p-4 flex items-center justify-center" style={{ height: '300px' }}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-8 border-gray-200 dark:border-gray-700 border-t-blue-500 animate-spin"></div>
          </div>
        ) : !chartData ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Aucune donnée disponible
          </div>
        ) : (
          <Doughnut data={chartData} options={options} />
        )}
      </div>
    </div>
  )
} 