'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Import dynamique pour éviter les erreurs de SSR avec la caméra
const QRCodeScannerComponent = dynamic(() => import('../outillage/QRCodeScanner'), { ssr: false })

interface EmplacementQRScannerProps {
  onScanComplete: (rackId: string, ligne: number, colonne: number, qrCode: string) => void
}

export default function EmplacementQRScanner({ onScanComplete }: EmplacementQRScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState<string>('')
  
  // Traitement du QR code scanné
  const handleScanSuccess = (decodedText: string) => {
    try {
      console.log('QR Code scanné:', decodedText);
      
      // Vérifier si c'est une URL contenant le paramètre code
      let codeValue = decodedText;
      try {
        // Essayer de parser l'URL
        const url = new URL(decodedText);
        const codeParam = url.searchParams.get('code');
        
        if (codeParam) {
          // Si un paramètre code est trouvé, l'utiliser
          codeValue = decodeURIComponent(codeParam);
          console.log('Code extrait de l\'URL:', codeValue);
        }
      } catch (e) {
        // Ce n'est pas une URL valide, continuer avec la valeur d'origine
        console.log('Ce n\'est pas une URL valide, utilisation de la valeur brute');
      }
      
      // Vérifier le format attendu: EMP-[ID_DU_RACK]-[LIGNE]-[COLONNE]
      const qrCodeRegex = /^EMP-([a-zA-Z0-9-]+)-(\d+)-(\d+)$/
      const match = codeValue.match(qrCodeRegex)
      
      if (!match) {
        throw new Error('Format de QR code non reconnu: ' + codeValue)
      }
      
      // Extraire les informations
      const [_, rackId, ligneStr, colonneStr] = match
      const ligne = parseInt(ligneStr)
      const colonne = parseInt(colonneStr)
      
      if (isNaN(ligne) || isNaN(colonne)) {
        throw new Error('Coordonnées d\'emplacement invalides')
      }
      
      // Transmettre les informations via le callback
      onScanComplete(rackId, ligne, colonne, codeValue)
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erreur lors de l\'analyse du QR code')
      }
      
      console.error('Erreur lors de l\'analyse du QR code:', err)
    }
  }
  
  // Traitement du code entré manuellement
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim())
    }
  }
  
  // Gestion des erreurs de scan
  const handleScanError = (errorMessage: string) => {
    setError(errorMessage)
  }
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8">
        <QRCodeScannerComponent 
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
        />
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-medium mb-4">
          Saisie manuelle du code
        </h3>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Format: EMP-XXXX-Y-Z"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Valider
          </button>
        </form>
      </div>
    </div>
  )
} 