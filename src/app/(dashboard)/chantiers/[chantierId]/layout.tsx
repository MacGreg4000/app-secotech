'use client'
import { useState, useEffect } from 'react'
import { ChantierHeader } from '@/components/ChantierHeader'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function ChantierLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { chantierId: string }
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [chantier, setChantier] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    const fetchChantier = async () => {
      try {
        const res = await fetch(`/api/chantiers/${params.chantierId}`)
        if (!res.ok) {
          throw new Error('Erreur lors de la récupération du chantier')
        }
        const data = await res.json()
        setChantier(data)
        setLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors de la récupération du chantier')
        setLoading(false)
      }
    }

    fetchChantier()
  }, [params.chantierId, status, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    )
  }

  if (!chantier) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-700 dark:text-gray-300 text-xl">Chantier non trouvé</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ChantierHeader avec position fixe */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-md">
        <ChantierHeader 
          chantierId={params.chantierId}
          chantier={{
            nomChantier: chantier.nomChantier,
            etatChantier: chantier.etatChantier
          }} 
        />
      </div>
      
      {/* Contenu de la page */}
      <div className="pt-4">
        {children}
      </div>
    </div>
  )
} 