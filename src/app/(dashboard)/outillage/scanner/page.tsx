'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Import dynamique pour éviter les erreurs de SSR avec la caméra
const QRCodeScanner = dynamic(
  () => import('@/components/outillage/QRCodeScanner'),
  { ssr: false }
)

export default function ScannerPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleScanSuccess = (result: string) => {
    try {
      // Vérifier si l'URL correspond à une URL de machine
      const url = new URL(result)
      const path = url.pathname
      if (path.startsWith('/outillage/')) {
        router.push(path)
      } else {
        setError('QR code invalide : ce n\'est pas une machine')
      }
    } catch (error) {
      setError('QR code invalide')
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Scanner un QR code
            </h3>
            <div className="mt-5">
              <QRCodeScanner
                onScanSuccess={handleScanSuccess}
                onScanError={(error) => setError(error)}
              />
              {error && (
                <div className="mt-4 p-4 rounded-md bg-red-50">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 