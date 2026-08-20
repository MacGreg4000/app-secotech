'use client'

// Ligne du tableau de validation d'une commande sous-traitant.
//
// Extraite de la page pour une seule raison : les hooks react-dnd ne peuvent pas
// vivre dans un `.map()`. Le rendu reproduit exactement l'existant — seule la
// colonne de poignée est nouvelle.
//
// La réorganisation utilise le même hook que la commande client, donc le même
// comportement de glisser : c'est ce qui était demandé.

import { Bars3Icon, CheckIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import NumericInput from '@/components/ui/NumericInput'
import { useLigneDeplacable } from './useLigneDeplacable'

interface LigneST {
  id: number
  article: string
  description: string
  type?: string
  unite: string
  prixUnitaire: number
  quantite: number
  total: number
}

interface Props {
  ligne: LigneST
  index: number
  isEditing: boolean
  ligneTemp?: { description: string; prixUnitaire: number; quantite: number }
  estVerrouillee: boolean
  submitting: boolean
  onInputChange: (id: number, champ: string, valeur: string | number) => void
  onSave: (id: number) => void
  onCancel: () => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  moveLigne: (dragIndex: number, hoverIndex: number) => void
  onDrop: () => void
}

export default function LigneCommandeSoustraitantRow({
  ligne,
  index,
  isEditing,
  ligneTemp,
  estVerrouillee,
  submitting,
  onInputChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  moveLigne,
  onDrop,
}: Props) {
  const { refLigne, refPoignee, handlerId, isDragging } = useLigneDeplacable(
    ligne.id,
    index,
    moveLigne,
    { typeElement: 'ligne-st', onDrop }
  )

  const estSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

  return (
    <tr
      ref={refLigne}
      data-handler-id={handlerId}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`transition-colors ${
        isEditing
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : index % 2 === 0
            ? 'bg-white dark:bg-gray-800'
            : 'bg-gray-50 dark:bg-gray-800/80'
      }`}
    >
      <td className="px-2 py-4 align-top">
        {!estVerrouillee ? (
          <div
            ref={refPoignee}
            className="inline-flex cursor-move items-center justify-center rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Glisser pour réorganiser"
          >
            <Bars3Icon className={`h-5 w-5 ${estSection ? 'text-blue-500 dark:text-blue-300' : ''}`} />
          </div>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          {ligne.article}
        </span>
      </td>
      <td className="px-4 py-4 align-top">
        {isEditing ? (
          <textarea
            value={ligneTemp?.description || ''}
            onChange={(e) => onInputChange(ligne.id, 'description', e.target.value)}
            className="w-full px-3 py-2 text-sm border-2.border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            rows={2}
          />
        ) : (
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ligne.description}</p>
        )}
      </td>
      <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">{ligne.unite}</td>
      <td className="px-4 py-4 text-right">
        {isEditing ? (
          <NumericInput
            value={ligneTemp?.quantite ?? ligne.quantite}
            onChangeNumber={(val) => onInputChange(ligne.id, 'quantite', val)}
            step="0.01"
            className="w-24 px-3 py-2 text-sm text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        ) : (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {ligne.quantite.toLocaleString('fr-FR')}
          </span>
        )}
      </td>
      <td className="px-4 py-4 text-right">
        {isEditing ? (
          <NumericInput
            value={ligneTemp?.prixUnitaire ?? ligne.prixUnitaire}
            onChangeNumber={(val) => onInputChange(ligne.id, 'prixUnitaire', val)}
            step="0.01"
            className="w-24 px-3 py-2 text-sm text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        ) : (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {ligne.prixUnitaire.toLocaleString('fr-FR')} €
          </span>
        )}
      </td>
      <td className="px-4 py-4 text-right">
        <span className="font-bold text-gray-900 dark:text-gray-100">
          {isEditing && ligneTemp
            ? (ligneTemp.prixUnitaire * ligneTemp.quantite).toLocaleString('fr-FR')
            : ligne.total.toLocaleString('fr-FR')}{' '}
          €
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => onSave(ligne.id)}
                disabled={submitting}
                className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition disabled:opacity-50"
                title="Enregistrer"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={onCancel}
                disabled={submitting}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition disabled:opacity-50"
                title="Annuler"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </>
          ) : (
            !estVerrouillee && (
              <>
                <button
                  onClick={() => onEdit(ligne.id)}
                  disabled={submitting}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition disabled:opacity-50"
                  title="Modifier"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(ligne.id)}
                  disabled={submitting}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition disabled:opacity-50"
                  title="Supprimer"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )
          )}
        </div>
      </td>
    </tr>
  )
}
