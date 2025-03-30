'use client'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { SoustraitantEtat, LigneSoustraitantEtat, AvenantSoustraitantEtat, EtatAvancementSummary } from '@/types/etat-avancement'
import { calculerMontantsLigne } from '@/utils/calculs'

interface EditableSoustraitantEtatProps {
  soustraitantEtat: SoustraitantEtat
  chantierId: string
  onUpdate: () => void
}

export default function EditableSoustraitantEtat({
  soustraitantEtat,
  chantierId,
  onUpdate
}: EditableSoustraitantEtatProps) {
  const [lignes, setLignes] = useState<LigneSoustraitantEtat[]>([])
  const [avenants, setAvenants] = useState<AvenantSoustraitantEtat[]>([])
  const [commentaires, setCommentaires] = useState<string>(soustraitantEtat.commentaires || '')
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<EtatAvancementSummary>({
    totalCommandeInitiale: {
      precedent: 0,
      actuel: 0,
      total: 0
    },
    totalAvenants: {
      precedent: 0,
      actuel: 0,
      total: 0
    },
    totalGeneral: {
      precedent: 0,
      actuel: 0,
      total: 0
    }
  })
  const [valueBeingEdited, setValueBeingEdited] = useState<string | null>(null)

  // Initialiser les lignes et avenants
  useEffect(() => {
    if (soustraitantEtat) {
      setLignes(soustraitantEtat.lignes.map(ligne => ({
        ...ligne,
        quantiteTotale: ligne.quantitePrecedente + ligne.quantiteActuelle,
        montantActuel: ligne.quantiteActuelle * ligne.prixUnitaire,
        montantTotal: ligne.montantPrecedent + (ligne.quantiteActuelle * ligne.prixUnitaire)
      })))

      if (soustraitantEtat.avenants && soustraitantEtat.avenants.length > 0) {
        setAvenants(soustraitantEtat.avenants.map(avenant => ({
          ...avenant,
          quantiteTotale: avenant.quantitePrecedente + avenant.quantiteActuelle,
          montantActuel: avenant.quantiteActuelle * avenant.prixUnitaire,
          montantTotal: avenant.montantPrecedent + (avenant.quantiteActuelle * avenant.prixUnitaire)
        })))
      }

      setCommentaires(soustraitantEtat.commentaires || '')
    }
  }, [soustraitantEtat])

  // Calculer les totaux
  useEffect(() => {
    // Calcul du total des lignes de commande initiale
    const totalCommandeInitiale = lignes.reduce(
      (acc, ligne) => {
        return {
          precedent: acc.precedent + ligne.montantPrecedent,
          actuel: acc.actuel + ligne.montantActuel,
          total: acc.total + ligne.montantTotal
        }
      },
      { precedent: 0, actuel: 0, total: 0 }
    )

    // Calcul du total des avenants
    const totalAvenants = avenants.reduce(
      (acc, avenant) => {
        return {
          precedent: acc.precedent + avenant.montantPrecedent,
          actuel: acc.actuel + avenant.montantActuel,
          total: acc.total + avenant.montantTotal
        }
      },
      { precedent: 0, actuel: 0, total: 0 }
    )

    // Calcul du total général
    const totalGeneral = {
      precedent: totalCommandeInitiale.precedent + totalAvenants.precedent,
      actuel: totalCommandeInitiale.actuel + totalAvenants.actuel,
      total: totalCommandeInitiale.total + totalAvenants.total
    }

    setSummary({
      totalCommandeInitiale,
      totalAvenants,
      totalGeneral
    })
  }, [lignes, avenants])

  // Mettre à jour la quantité actuelle d'une ligne
  const handleLigneQuantiteChange = (id: number, valueStr: string) => {
    // Permettre la saisie de valeurs vides ou de nombres
    let value = 0;
    
    if (valueStr !== '') {
      value = parseFloat(valueStr);
      if (isNaN(value)) value = 0;
    }
    
    setLignes(prevLignes => 
      prevLignes.map(ligne => {
        if (ligne.id === id) {
          const updatedLigne = {
            ...ligne,
            quantiteActuelle: value
          }
          return calculerMontantsLigne(updatedLigne)
        }
        return ligne
      })
    )
  }

  // Mettre à jour la quantité actuelle d'un avenant
  const handleAvenantQuantiteChange = (id: number, valueStr: string) => {
    // Permettre la saisie de valeurs vides ou de nombres
    let value = 0;
    
    if (valueStr !== '') {
      value = parseFloat(valueStr);
      if (isNaN(value)) value = 0;
    }
    
    setAvenants(prevAvenants => 
      prevAvenants.map(avenant => {
        if (avenant.id === id) {
          const updatedAvenant = {
            ...avenant,
            quantiteActuelle: value
          }
          return {
            ...updatedAvenant,
            quantiteTotale: updatedAvenant.quantitePrecedente + updatedAvenant.quantiteActuelle,
            montantActuel: updatedAvenant.quantiteActuelle * updatedAvenant.prixUnitaire,
            montantTotal: updatedAvenant.montantPrecedent + (updatedAvenant.quantiteActuelle * updatedAvenant.prixUnitaire)
          }
        }
        return avenant
      })
    )
  }

  // Sauvegarder les modifications
  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Préparer les données à envoyer
      const data = {
        commentaires,
        lignes: lignes.map(ligne => ({
          id: ligne.id,
          quantiteActuelle: ligne.quantiteActuelle
        })),
        avenants: avenants.map(avenant => ({
          id: avenant.id,
          quantiteActuelle: avenant.quantiteActuelle
        }))
      }
      
      // Envoyer les données au serveur
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantEtat.soustraitantId}/etats-avancement/${soustraitantEtat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la mise à jour')
      }
      
      toast.success('État d\'avancement mis à jour avec succès')
      onUpdate()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Commentaires */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Commentaires</h2>
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          rows={4}
          value={commentaires}
          onChange={(e) => setCommentaires(e.target.value)}
          placeholder="Ajouter des commentaires..."
        />
      </div>

      {/* Tableau des lignes de commande initiale */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Commande initiale
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Article
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Unité
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prix unitaire
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantité
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Précédent
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actuel
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Montant précédent
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Montant actuel
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Montant total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {lignes.map((ligne) => (
                <tr key={ligne.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.article}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{ligne.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.unite}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.prixUnitaire.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.quantite.toLocaleString('fr-FR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.quantitePrecedente.toLocaleString('fr-FR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    <input
                      type="text"
                      className="w-20 p-1 text-center border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={ligne.quantiteActuelle === 0 && valueBeingEdited === `ligne-${ligne.id}` ? '' : ligne.quantiteActuelle}
                      onChange={(e) => {
                        setValueBeingEdited(`ligne-${ligne.id}`);
                        handleLigneQuantiteChange(ligne.id, e.target.value);
                      }}
                      onBlur={() => setValueBeingEdited('')}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.quantiteTotale.toLocaleString('fr-FR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.montantPrecedent.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.montantActuel.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{ligne.montantTotal.toLocaleString('fr-FR')} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau des avenants */}
      {avenants && avenants.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Avenants
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Article
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unité
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Prix unitaire
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Précédent
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actuel
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Montant précédent
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Montant actuel
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Montant total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {avenants.map((avenant) => (
                  <tr key={avenant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.article}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{avenant.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.unite}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.prixUnitaire.toLocaleString('fr-FR')} €</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.quantite.toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.quantitePrecedente.toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      <input
                        type="text"
                        className="w-20 p-1 text-center border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={avenant.quantiteActuelle === 0 && valueBeingEdited === `avenant-${avenant.id}` ? '' : avenant.quantiteActuelle}
                        onChange={(e) => {
                          setValueBeingEdited(`avenant-${avenant.id}`);
                          handleAvenantQuantiteChange(avenant.id, e.target.value);
                        }}
                        onBlur={() => setValueBeingEdited('')}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.quantiteTotale.toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.montantPrecedent.toLocaleString('fr-FR')} €</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.montantActuel.toLocaleString('fr-FR')} €</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{avenant.montantTotal.toLocaleString('fr-FR')} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Récapitulatif */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Récapitulatif
          </h2>
        </div>
        
        <div className="p-6">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Elément</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Précédent</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actuel</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">Commande initiale</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{summary.totalCommandeInitiale.precedent.toLocaleString('fr-FR')} €</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{summary.totalCommandeInitiale.actuel.toLocaleString('fr-FR')} €</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{summary.totalCommandeInitiale.total.toLocaleString('fr-FR')} €</td>
              </tr>
              {avenants && avenants.length > 0 && (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">Avenants</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{summary.totalAvenants.precedent.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{summary.totalAvenants.actuel.toLocaleString('fr-FR')} €</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{summary.totalAvenants.total.toLocaleString('fr-FR')} €</td>
                </tr>
              )}
              <tr className="bg-blue-50 dark:bg-blue-900">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">TOTAL GÉNÉRAL</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{summary.totalGeneral.precedent.toLocaleString('fr-FR')} €</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{summary.totalGeneral.actuel.toLocaleString('fr-FR')} €</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{summary.totalGeneral.total.toLocaleString('fr-FR')} €</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  )
} 