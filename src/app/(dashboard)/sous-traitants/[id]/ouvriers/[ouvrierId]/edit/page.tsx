'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FormInput, Button } from '@/components/ui'

interface FormData {
  nom: string
  prenom: string
  email: string
  telephone: string
  dateEntree: string
  poste: string
}

export default function EditOuvrierPage(
  props: { 
    params: Promise<{ id: string, ouvrierId: string }> 
  }
) {
  const params = use(props.params);
  const router = useRouter()
  const { data: session } = useSession()
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    dateEntree: '',
    poste: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetch(`/api/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}`)
        .then(res => res.json())
        .then(data => {
          setFormData({
            nom: data.nom,
            prenom: data.prenom,
            email: data.email || '',
            telephone: data.telephone || '',
            dateEntree: new Date(data.dateEntree).toISOString().split('T')[0],
            poste: data.poste
          })
          setLoading(false)
        })
        .catch(error => {
          console.error('Erreur:', error)
          setError('Erreur lors du chargement des données')
          setLoading(false)
        })
    }
  }, [session, params.id, params.ouvrierId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la mise à jour de l\'ouvrier')
      }

      router.push(`/sous-traitants/${params.id}/ouvriers`)
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
            Modifier l'Ouvrier
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
            label="Nom"
            required
            value={formData.nom}
            onChange={handleChange}
          />

          <FormInput
            id="prenom"
            name="prenom"
            type="text"
            label="Prénom"
            required
            value={formData.prenom}
            onChange={handleChange}
          />

          <FormInput
            id="email"
            name="email"
            type="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
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
            id="dateEntree"
            name="dateEntree"
            type="date"
            label="Date d'entrée"
            value={formData.dateEntree}
            onChange={handleChange}
          />

          <FormInput
            id="poste"
            name="poste"
            type="text"
            label="Poste"
            required
            value={formData.poste}
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