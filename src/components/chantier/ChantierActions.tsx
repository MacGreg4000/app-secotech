'use client'
import Link from 'next/link'
import { 
  DocumentTextIcon, 
  ClipboardDocumentListIcon,
  FolderIcon,
  ChartBarIcon,
  PencilSquareIcon,
  CurrencyEuroIcon
} from '@heroicons/react/24/outline'

interface ChantierActionsProps {
  chantierId: string
  className?: string
}

export default function ChantierActions({ chantierId, className = '' }: ChantierActionsProps) {
  return (
    <div className={`flex justify-center space-x-3 ${className}`}>
      <Link
        href={`/chantiers/${chantierId}/edit`}
        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
        title="Éditer"
      >
        <PencilSquareIcon className="h-5 w-5" />
      </Link>
      <Link
        href={`/chantiers/${chantierId}/commande`}
        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
        title="Commande"
      >
        <CurrencyEuroIcon className="h-5 w-5" />
      </Link>
      <Link
        href={`/chantiers/${chantierId}/etats`}
        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
        title="États d'avancement"
      >
        <ChartBarIcon className="h-5 w-5" />
      </Link>
      <Link
        href={`/chantiers/${chantierId}/documents`}
        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
        title="Documents"
      >
        <FolderIcon className="h-5 w-5" />
      </Link>
      <Link
        href={`/chantiers/${chantierId}/notes`}
        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
        title="Notes et tâches"
      >
        <ClipboardDocumentListIcon className="h-5 w-5" />
      </Link>
      <Link
        href={`/chantiers/${chantierId}/rapports`}
        className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
        title="Rapports de visite"
      >
        <DocumentTextIcon className="h-5 w-5" />
      </Link>
    </div>
  )
} 