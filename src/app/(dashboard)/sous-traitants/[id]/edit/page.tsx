'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FormInput, FormTextarea, Button } from '@/components/ui'

interface FormData {
  nom: string
  email: string
  contact: string
  telephone: string
  adresse: string
  tva: string
}

export default function EditSousTraitantPage(
  props: { 
    params: Promise<{ id: string }> 
  }
) {
  const params = use(props.params);
  const router = useRouter()
  const { data: session } = useSession()
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    email: '',
    contact: '',
    telephone: '',
    adresse: '',
    tva: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetch(`/api/sous-traitants/${params.id}`)
        .then(res => res.json())
        .then(data => {
          setFormData({
            nom: data.nom,
            email: data.email,
            contact: data.contact || '',
            telephone: data.telephone || '',
            adresse: data.adresse || '',
            tva: data.tva || ''
          })
          setLoading(false)
        })
        .catch(error => {
          console.error('Erreur:', error)
          setError('Erreur lors du chargement des données')
          setLoading(false)
        })
    }
  }, [session, params.id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    console.log('Envoi des données du sous-traitant pour mise à jour:', formData)

    try {
      const response = await fetch(`/api/sous-traitants/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du sous-traitant')
      }

      router.push('/sous-traitants')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Modifier le Sous-Traitant
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <FormInput
            id="nom"
            name="nom"
            type="text"
            label="Nom de l'entreprise"
            required
            value={formData.nom}
            onChange={handleChange}
          />

          <FormInput
            id="email"
            name="email"
            type="email"
            label="Email"
            required
            value={formData.email}
            onChange={handleChange}
          />

          <FormInput
            id="contact"
            name="contact"
            type="text"
            label="Personne de contact"
            value={formData.contact}
            onChange={handleChange}
          />

          <FormInput
            id="tva"
            name="tva"
            type="text"
            label="Numéro de TVA"
            value={formData.tva}
            onChange={handleChange}
            placeholder="BE0123456789"
          />

          <FormInput
            id="telephone"
            name="telephone"
            type="tel"
            label="Téléphone"
            value={formData.telephone}
            onChange={handleChange}
          />

          <FormInput
            id="adresse"
            name="adresse"
            type="text"
            label="Adresse"
            value={formData.adresse}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            isLoading={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  )
} 