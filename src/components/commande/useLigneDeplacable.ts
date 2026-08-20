'use client'

// Comportement « glisser pour réorganiser » d'une ligne de tableau.
//
// Extrait de LigneCommande (commande client) pour être partagé avec la commande
// sous-traitant. La logique de survol tient en peu de lignes mais elle est
// subtile — le seuil au milieu de la ligne évite l'oscillation quand le curseur
// stationne sur une frontière. En recopier une seconde version, c'était garantir
// que les deux écrans finissent par ne plus se comporter pareil.
//
// La poignée seule est draggable (`refPoignee`), pas la ligne entière : sinon on
// ne pourrait plus sélectionner du texte ni cliquer dans les champs de saisie.

import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'

interface ElementGlisse {
  index: number
  id: number
}

export function useLigneDeplacable(
  id: number,
  index: number,
  moveLigne: (dragIndex: number, hoverIndex: number) => void,
  options?: {
    /** Type react-dnd — à distinguer si deux tableaux coexistent sur un écran. */
    typeElement?: string
    /** Appelé une fois le glisser terminé : moment idoine pour persister. */
    onDrop?: () => void
  }
) {
  const typeElement = options?.typeElement ?? 'ligne'
  const refLigne = useRef<HTMLTableRowElement>(null)
  const refPoignee = useRef<HTMLDivElement>(null)

  const [{ handlerId }, drop] = useDrop<ElementGlisse, void, { handlerId: unknown }>({
    accept: typeElement,
    collect(monitor) {
      return { handlerId: monitor.getHandlerId() }
    },
    hover(item, monitor) {
      if (!refLigne.current) return
      const dragIndex = item.index
      const hoverIndex = index
      if (dragIndex === hoverIndex) return

      const rect = refLigne.current.getBoundingClientRect()
      const milieuY = (rect.bottom - rect.top) / 2
      const offset = monitor.getClientOffset()
      if (!offset) return
      const positionY = offset.y - rect.top

      // On ne permute qu'une fois le milieu de la ligne dépassé : sans ce seuil,
      // le tableau oscillerait tant que le curseur reste sur la frontière.
      if (dragIndex < hoverIndex && positionY < milieuY) return
      if (dragIndex > hoverIndex && positionY > milieuY) return

      moveLigne(dragIndex, hoverIndex)
      // Muter item.index est voulu (motif react-dnd) : l'élément glissé doit
      // connaître sa nouvelle position pour les survols suivants.
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: typeElement,
    item: () => ({ id, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => {
      options?.onDrop?.()
    },
  })

  drag(refPoignee)
  drop(refLigne)

  return { refLigne, refPoignee, handlerId, isDragging }
}
