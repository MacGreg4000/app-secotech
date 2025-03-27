'use client'
import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { 
  HomeIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  FolderIcon,
  DocumentTextIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Ne pas afficher la navbar sur la page de login
  if (pathname === '/auth/login') return null

  return (
    <nav className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo/Home */}
            <Link 
              href="/dashboard" 
              className="flex items-center px-2 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <HomeIcon className="h-6 w-6" />
              <span className="ml-2 font-medium">AppSecotech</span>
            </Link>

            {/* Navigation principale */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/chantiers"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  pathname.startsWith('/chantiers')
                    ? 'text-gray-900 dark:text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <BuildingOfficeIcon className="h-5 w-5 mr-1.5" />
                Chantiers
              </Link>

              <Link
                href="/clients"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  pathname.startsWith('/clients')
                    ? 'text-gray-900 dark:text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <UserGroupIcon className="h-5 w-5 mr-1.5" />
                Clients
              </Link>

              <Link
                href="/sous-traitants"
                className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium ${
                  pathname.startsWith('/sous-traitants')
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Sous-Traitants
              </Link>

              <Link
                href="/administratif"
                className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium ${
                  pathname.startsWith('/administratif')
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Administratifs
              </Link>
            </div>
          </div>

          {/* Actions à droite */}
          <div className="flex items-center">
            {session ? (
              <>
                {/* Outillage déplacé à droite */}
                <Link
                  href="/outillage"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <WrenchScrewdriverIcon className="h-5 w-5" />
                </Link>
                
                {/* Inventaire */}
                <Link
                  href="/inventory"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <CubeIcon className="h-5 w-5" />
                </Link>
                
                {/* Séparateur vertical */}
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                
                {/* Configuration */}
                <Link
                  href="/configuration"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </Link>

                {/* Gestion utilisateurs (ADMIN/MANAGER uniquement) */}
                {session?.user?.role && ['ADMIN', 'MANAGER'].includes(session.user.role as string) && (
                  <Link
                    href="/utilisateurs"
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <UserCircleIcon className="h-5 w-5" />
                  </Link>
                )}

                {/* Bouton de thème */}
                <ThemeToggle />

                {/* Menu utilisateur simplifié */}
                <div className="ml-3 relative flex items-center gap-4">
                  <button
                    onClick={() => signOut()}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 