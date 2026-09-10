'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

export interface ResizableSectionsOptions<Id extends string> {
  ids: readonly Id[]
  defaultWeights: Record<Id, number>
  minWeights: Record<Id, number>
  open: Record<Id, boolean>
  separatorHeight?: number
}

export interface ResizableSections<Id extends string> {
  layoutRef: React.RefObject<HTMLDivElement | null>
  gridTemplateRows: string
  weights: Record<Id, number>
  separatorAfter: (id: Id) => boolean
  beginResize: (id: Id) => (event: React.PointerEvent<HTMLElement>) => void
  separatorHeight: number
}

function nextOpenAfter<Id extends string>(
  ids: readonly Id[],
  open: Record<Id, boolean>,
  id: Id,
): Id | null {
  const index = ids.indexOf(id)
  for (let i = index + 1; i < ids.length; i++) {
    if (open[ids[i]]) return ids[i]
  }
  return null
}

/**
 * Draggable-separator layout for N collapsible sidebar sections. A separator
 * resizes only its two neighbours, clamped against that pair's own sum.
 */
export function useResizableSections<Id extends string>(
  options: ResizableSectionsOptions<Id>,
): ResizableSections<Id> {
  const { ids, defaultWeights, minWeights, open, separatorHeight = 8 } = options

  const [weights, setWeights] = React.useState<Record<Id, number>>(defaultWeights)

  const layoutRef = React.useRef<HTMLDivElement | null>(null)
  const dragStateRef = React.useRef<{
    id: Id
    nextId: Id
    startY: number
    startWeight: number
    /** Locked in at drag start; the pair's sum stays invariant through the drag. */
    pairSum: number
    /** Pixels per weight unit, so pointer movement maps onto the weights. */
    pixelsPerUnit: number
  } | null>(null)

  const separatorAfter = React.useCallback(
    (id: Id) => Boolean(open[id]) && nextOpenAfter(ids, open, id) !== null,
    [ids, open],
  )

  const handlePointerMove = React.useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current
    if (!drag || drag.pixelsPerUnit <= 0) return

    const delta = (event.clientY - drag.startY) / drag.pixelsPerUnit
    const next = Math.min(
      drag.pairSum - minWeights[drag.nextId],
      Math.max(minWeights[drag.id], drag.startWeight + delta),
    )

    setWeights(current => ({ ...current, [drag.id]: next, [drag.nextId]: drag.pairSum - next }))
  }, [minWeights])

  const stopDragging = React.useCallback(() => {
    dragStateRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopDragging)
    window.removeEventListener('pointercancel', stopDragging)
  }, [handlePointerMove])

  React.useEffect(() => stopDragging, [stopDragging])

  const beginResize = React.useCallback(
    (id: Id) => (event: React.PointerEvent<HTMLElement>) => {
      const layout = layoutRef.current
      if (!layout) return

      const nextId = nextOpenAfter(ids, open, id)
      if (!nextId) return

      const openTotal = ids.reduce(
        (sum, sectionId) => (open[sectionId] ? sum + weights[sectionId] : sum),
        0,
      )
      const renderedSeparators = ids.filter(sectionId => separatorAfter(sectionId)).length
      const flexibleHeight = layout.clientHeight - separatorHeight * renderedSeparators
      if (flexibleHeight <= 0 || openTotal <= 0) return

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      dragStateRef.current = {
        id,
        nextId,
        startY: event.clientY,
        startWeight: weights[id],
        pairSum: weights[id] + weights[nextId],
        pixelsPerUnit: flexibleHeight / openTotal,
      }

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', stopDragging)
      window.addEventListener('pointercancel', stopDragging)
    },
    [ids, open, weights, separatorAfter, separatorHeight, handlePointerMove, stopDragging],
  )

  const gridTemplateRows = React.useMemo(() => {
    const rows: string[] = []
    for (const id of ids) {
      // A collapsed section shows only its header, so its row is auto rather than a weighted fr.
      rows.push(open[id] ? `${weights[id]}fr` : 'auto')
      if (separatorAfter(id)) rows.push(`${separatorHeight}px`)
    }
    return rows.join(' ')
  }, [ids, open, weights, separatorAfter, separatorHeight])

  return { layoutRef, gridTemplateRows, weights, separatorAfter, beginResize, separatorHeight }
}
