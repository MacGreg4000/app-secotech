'use client'

import { Navbar } from '@/components/Navbar'
import DashboardPage from './(dashboard)/page'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DashboardPage />
        </div>
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic';
