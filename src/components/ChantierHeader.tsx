'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  DocumentTextIcon, 
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  PencilSquareIcon,
  CurrencyEuroIcon
} from '@heroicons/react/24/outline'

interface ChantierHeaderProps {
  chantierId: string
  chantier: {
    nomChantier: string
    etatChantier: string
  }
}

export function ChantierHeader({ chantierId, chantier }: ChantierHeaderProps) {
  const pathname = usePathname();
  
  // Fonction pour déterminer si un lien est actif
  const isActive = (path: string) => {
    return pathname.includes(path);
  };

  // Définir les couleurs des icônes
  const getIconColor = (path: string) => {
    if (isActive(path)) {
      return "text-blue-600";
    }
    
    // Couleurs spécifiques pour chaque type d'action
    switch (path) {
      case '/edit':
        return "text-yellow-500 group-hover:text-yellow-600";
      case '/commande':
        return "text-blue-500 group-hover:text-blue-600";
      case '/etats':
        return "text-blue-500 group-hover:text-blue-600";
      case '/documents':
        return "text-green-500 group-hover:text-green-600";
      case '/notes':
        return "text-purple-500 group-hover:text-purple-600";
      case '/rapports':
        return "text-red-500 group-hover:text-red-600";
      default:
        return "text-gray-500 group-hover:text-gray-700";
    }
  };

  return (
    <div className="bg-white shadow-md transition-all duration-300 hover:shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="transform transition-all duration-300 hover:scale-[1.01]">
            <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {chantier.nomChantier}
            </h1>
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-300
                ${chantier.etatChantier === 'En cours' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                ${chantier.etatChantier === 'Terminé' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : ''}
                ${chantier.etatChantier === 'En préparation' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
              `}>
                {chantier.etatChantier}
              </span>
            </div>
          </div>
          
          <nav className="flex flex-wrap gap-2 md:gap-3">
            {/* Éditer */}
            <Link
              href={`/chantiers/${chantierId}/edit`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/edit') 
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <PencilSquareIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/edit')}`} />
              Éditer
            </Link>
            
            {/* Commande */}
            <Link
              href={`/chantiers/${chantierId}/commande`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/commande') 
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <CurrencyEuroIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/commande')}`} />
              Commande
            </Link>
            
            {/* États d'avancement */}
            <Link
              href={`/chantiers/${chantierId}/etats`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/etats') 
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <ChartBarIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/etats')}`} />
              États
            </Link>
            
            {/* Documents */}
            <Link
              href={`/chantiers/${chantierId}/documents`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/documents') 
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <DocumentDuplicateIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/documents')}`} />
              Documents
            </Link>
            
            {/* Notes */}
            <Link
              href={`/chantiers/${chantierId}/notes`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/notes') 
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <ClipboardDocumentListIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/notes')}`} />
              Notes
            </Link>
            
            {/* Rapports de visite */}
            <Link
              href={`/chantiers/${chantierId}/rapports`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/rapports') 
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <DocumentTextIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/rapports')}`} />
              Rapports
            </Link>
          </nav>
        </div>
      </div>
    </div>
  )
} 