'use client'
import { Fragment, useState } from 'react'
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
  CubeIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

            {/* Navigation principale pour écrans > sm */}
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

          {/* Bouton du menu mobile */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
              aria-expanded="false"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Ouvrir le menu principal</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Actions à droite */}
          <div className="hidden sm:flex items-center">
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
                    onClick={() => signOut({ callbackUrl: '/' })}
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

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/chantiers"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.startsWith('/chantiers')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-3" />
                Chantiers
              </div>
            </Link>

            <Link
              href="/clients"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.startsWith('/clients')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-3" />
                Clients
              </div>
            </Link>

            <Link
              href="/sous-traitants"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.startsWith('/sous-traitants')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 mr-3" />
                Sous-Traitants
              </div>
            </Link>

            <Link
              href="/administratif"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.startsWith('/administratif')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-3" />
                Administratifs
              </div>
            </Link>

            <Link
              href="/outillage"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.startsWith('/outillage')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <WrenchScrewdriverIcon className="h-5 w-5 mr-3" />
                Outillage
              </div>
            </Link>

            <Link
              href="/inventory"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname.startsWith('/inventory')
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <CubeIcon className="h-5 w-5 mr-3" />
                Inventaire
              </div>
            </Link>

            {session?.user?.role && ['ADMIN', 'MANAGER'].includes(session.user.role as string) && (
              <Link
                href="/utilisateurs"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname.startsWith('/utilisateurs')
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <UserCircleIcon className="h-5 w-5 mr-3" />
                  Utilisateurs
                </div>
              </Link>
            )}

            <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center">
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-2"
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
} 