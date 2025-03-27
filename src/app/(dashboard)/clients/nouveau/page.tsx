'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput, FormTextarea, Button } from '@/components/ui'

interface FormData {
  nom: string
  email: string
  telephone: string
  adresse: string
}

export default function NouveauClientPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    email: '',
    telephone: '',
    adresse: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Réinitialiser l'erreur lorsque l'utilisateur modifie le formulaire
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    console.log('Envoi des données du client:', formData)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Erreur de réponse:', data)
        throw new Error(data.error || 'Erreur lors de la création du client')
      }
      
      console.log('Client créé avec succès:', data)
      router.push('/clients')
    } catch (error: any) {
      console.error('Erreur détaillée:', error)
      setError(error.message || 'Une erreur est survenue lors de la création du client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Nouveau client</h1>
      
      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <FormInput
            id="nom"
            name="nom"
            label="Nom du client"
            value={formData.nom}
            onChange={handleChange}
            required
            placeholder="Entrez le nom du client"
          />

          <FormInput
            id="email"
            name="email"
            type="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Entrez l'email du client"
          />

          <FormInput
            id="telephone"
            name="telephone"
            type="tel"
            label="Téléphone"
            value={formData.telephone}
            onChange={handleChange}
          />

          <FormTextarea
            id="adresse"
            name="adresse"
            label="Adresse"
            value={formData.adresse}
            onChange={handleChange}
            rows={3}
            placeholder="Entrez l'adresse complète"
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/clients')}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
            >
              {saving ? 'Création...' : 'Créer le client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 