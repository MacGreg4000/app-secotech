'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { AdminTasksContent } from '@/components/chantier/AdminTasksContent'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'

export default function ChantierAdminTasksPage({ 
  params 
}: { 
  params: { chantierId: string } 
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DocumentExpirationAlert />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tâches administratives</h1>
      </div>
      <AdminTasksContent chantierId={params.chantierId} />
    </div>
  )
} 