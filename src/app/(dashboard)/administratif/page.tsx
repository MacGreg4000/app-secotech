'use client'

import Link from 'next/link'
import { DocumentTextIcon, FolderIcon } from '@heroicons/react/24/outline'

export default function AdministratifPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-8 dark:text-white">Administratif</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Carte Dossier Fiches Techniques */}
        <Link 
          href="/administratif/fiches-techniques"
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center">
            <FolderIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <h2 className="text-xl font-semibold dark:text-white">Dossier Fiches Techniques</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Générer des dossiers techniques personnalisés pour vos chantiers
              </p>
            </div>
          </div>
        </Link>

        {/* Carte Documents Administratifs */}
        <Link 
          href="/administratif/documents"
          className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <h2 className="text-xl font-semibold dark:text-white">Documents Administratifs</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Accéder aux documents administratifs
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
} 