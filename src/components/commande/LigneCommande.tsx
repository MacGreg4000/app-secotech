'use client'

import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { BarsArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline'
import SelectField from '@/components/ui/SelectField'

interface LigneCommandeProps {
  id: number
  index: number
  article: string
  description: string
  type: string
  unite: string
  prixUnitaire: number
  quantite: number
  total: number
  estOption: boolean
  isLocked?: boolean
  moveLigne: (dragIndex: number, hoverIndex: number) => void
  updateLigne: (id: number, field: string, value: any) => void
  deleteLigne: (id: number) => void
}

interface DragItem {
  index: number
  id: number
  type: string
}

export default function LigneCommande({
  id,
  index,
  article,
  description,
  type,
  unite,
  prixUnitaire,
  quantite,
  total,
  estOption,
  isLocked = false,
  moveLigne,
  updateLigne,
  deleteLigne
}: LigneCommandeProps) {
  const ref = useRef<HTMLTableRowElement>(null)

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: any }>({
    accept: 'ligne',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item, monitor) {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) {
        return
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      moveLigne(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: 'ligne',
    item: () => {
      return { id, index }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const opacity = isDragging ? 0 : 1
  drag(drop(ref))

  return (
    <tr ref={ref} style={{ opacity }} data-handler-id={handlerId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-3 py-2 whitespace-nowrap cursor-move">
        <BarsArrowUpIcon className="h-5 w-5 text-gray-400" />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <input
          type="text"
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
          value={article}
          onChange={(e) => updateLigne(id, 'article', e.target.value)}
          disabled={isLocked}
          style={{ maxWidth: '100px' }}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
          value={description}
          onChange={(e) => updateLigne(id, 'description', e.target.value)}
          disabled={isLocked}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <select
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
          value={type}
          onChange={(e) => updateLigne(id, 'type', e.target.value)}
          disabled={isLocked}
        >
          <option value="QP">QP</option>
          <option value="QF">QF</option>
          <option value="Forfait">Forfait</option>
        </select>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <SelectField
          label=""
          name={`lignes[${index}].unite`}
          value={unite}
          onChange={(e) => updateLigne(id, 'unite', e.target.value)}
          className="w-full"
        >
          <option value="Mct">Mct</option>
          <option value="M2">M²</option>
          <option value="M3">M³</option>
          <option value="Heures">Heures</option>
          <option value="Pièces">Pièces</option>
        </SelectField>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
          value={prixUnitaire}
          onChange={(e) => updateLigne(id, 'prixUnitaire', parseFloat(e.target.value))}
          disabled={isLocked}
          style={{ maxWidth: '80px' }}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
          value={quantite}
          onChange={(e) => updateLigne(id, 'quantite', parseFloat(e.target.value))}
          disabled={isLocked}
          style={{ maxWidth: '80px' }}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        {total.toFixed(2)} €
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50"
          checked={estOption}
          onChange={(e) => updateLigne(id, 'estOption', e.target.checked)}
          disabled={isLocked}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        <button
          type="button"
          onClick={() => deleteLigne(id)}
          disabled={isLocked}
          className={`text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </td>
    </tr>
  )
} 