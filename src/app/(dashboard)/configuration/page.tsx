'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BuildingOfficeIcon } from '@heroicons/react/24/outline'
import DocumentManager from '@/components/documents/DocumentManager'

interface CompanySettings {
  name: string
  address: string
  zipCode: string
  city: string
  phone: string
  email: string
  iban: string
  tva: string
  logo: string // URL du logo stocké
  emailHost: string
  emailPort: string
  emailSecure: boolean
  emailUser: string
  emailPassword: string
  emailFrom: string
  emailFromName: string
}

export default function ConfigurationPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<CompanySettings>({
    name: '',
    address: '',
    zipCode: '',
    city: '',
    phone: '',
    email: '',
    iban: '',
    tva: '',
    logo: '',
    emailHost: '',
    emailPort: '',
    emailSecure: false,
    emailUser: '',
    emailPassword: '',
    emailFrom: '',
    emailFromName: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    try {
      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const { url } = await res.json()
        setSettings(prev => ({ ...prev, logo: url }))
      }
    } catch (error) {
      console.error('Erreur upload logo:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage('Configuration enregistrée')
        setTimeout(() => setMessage(''), 2000)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessage('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <BuildingOfficeIcon className="h-8 w-8" />
        Configuration de l'entreprise
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={e => setSettings(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="mt-1 block w-full"
            />
            {settings.logo && (
              <img 
                src={settings.logo} 
                alt="Logo" 
                className="mt-2 h-20 object-contain"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Adresse
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={e => setSettings(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Code postal
              </label>
              <input
                type="text"
                value={settings.zipCode}
                onChange={e => setSettings(prev => ({ ...prev, zipCode: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ville
              </label>
              <input
                type="text"
                value={settings.city}
                onChange={e => setSettings(prev => ({ ...prev, city: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Téléphone
            </label>
            <input
              type="tel"
              value={settings.phone}
              onChange={e => setSettings(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={e => setSettings(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              IBAN
            </label>
            <input
              type="text"
              value={settings.iban}
              onChange={e => setSettings(prev => ({ ...prev, iban: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="BE00 0000 0000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              N° TVA
            </label>
            <input
              type="text"
              value={settings.tva}
              onChange={e => setSettings(prev => ({ ...prev, tva: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {message && (
          <div className="mt-4 p-4 rounded bg-green-100 text-green-700">
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-2">
        Configuration des emails
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Serveur SMTP
            </label>
            <input
              type="text"
              value={settings.emailHost}
              onChange={e => setSettings(prev => ({ ...prev, emailHost: e.target.value }))}
              placeholder="smtp.example.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Port SMTP
            </label>
            <input
              type="text"
              value={settings.emailPort}
              onChange={e => setSettings(prev => ({ ...prev, emailPort: e.target.value }))}
              placeholder="587"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Connexion sécurisée
            </label>
            <div className="mt-2">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={settings.emailSecure}
                  onChange={e => setSettings(prev => ({ ...prev, emailSecure: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2">Utiliser SSL/TLS</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Utilisateur SMTP
            </label>
            <input
              type="text"
              value={settings.emailUser}
              onChange={e => setSettings(prev => ({ ...prev, emailUser: e.target.value }))}
              placeholder="user@example.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mot de passe SMTP
            </label>
            <input
              type="password"
              value={settings.emailPassword}
              onChange={e => setSettings(prev => ({ ...prev, emailPassword: e.target.value }))}
              placeholder="••••••••"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email expéditeur
            </label>
            <input
              type="email"
              value={settings.emailFrom}
              onChange={e => setSettings(prev => ({ ...prev, emailFrom: e.target.value }))}
              placeholder="noreply@votreentreprise.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nom de l'expéditeur
            </label>
            <input
              type="text"
              value={settings.emailFromName}
              onChange={e => setSettings(prev => ({ ...prev, emailFromName: e.target.value }))}
              placeholder="Secotech"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-2">
        Gestion des fiches techniques
      </h2>
      
      <DocumentManager />
    </div>
  )
} 