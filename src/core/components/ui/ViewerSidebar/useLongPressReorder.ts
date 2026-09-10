'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

export interface SectionBand {
  top: number
  bottom: number
}

export interface LongPressReorderOptions<Id extends string> {
  ids: readonly Id[]
  onReorder: (order: Id[]) => void
  /** Vertical extent of each section, for hit-testing the drag. Defaults to the registered element. */
  measure?: (id: Id) => SectionBand | null
  holdMs?: number
  moveTolerance?: number
}

export interface LongPressReorder<Id extends string> {
  order: readonly Id[]
  activeId: Id | null
  isReordering: boolean
  handlersFor: (id: Id) => {
    ref: (element: HTMLElement | null) => void
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void
    onClick: (event: React.MouseEvent<HTMLElement>) => void
  }
}

function moveTo<Id>(order: readonly Id[], id: Id, index: number): Id[] {
  const without = order.filter(other => other !== id)
  return [...without.slice(0, index), id, ...without.slice(index)]
}

function sameOrder<Id>(a: readonly Id[], b: readonly Id[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/**
 * Press-and-hold, then drag, to reorder a list of sections. A short press falls
 * through untouched so the header's own click still toggles the section.
 */
export function useLongPressReorder<Id extends string>(
  options: LongPressReorderOptions<Id>,
): LongPressReorder<Id> {
  const { ids, onReorder, measure, holdMs = 400, moveTolerance = 6 } = options

  const [activeId, setActiveId] = React.useState<Id | null>(null)
  const [draftOrder, setDraftOrder] = React.useState<Id[] | null>(null)

  const elementsRef = React.useRef(new Map<Id, HTMLElement>())
  const latestRef = React.useRef({ ids, onReorder, measure })
  latestRef.current = { ids, onReorder, measure }

  const swallowClickRef = React.useRef(false)

  const pressRef = React.useRef<{
    id: Id
    startY: number
    pointerId: number
    target: HTMLElement | null
    timer: ReturnType<typeof setTimeout> | null
    started: boolean
    draft: Id[]
  } | null>(null)

  const bandFor = React.useCallback((id: Id): SectionBand | null => {
    const custom = latestRef.current.measure
    if (custom) return custom(id)

    const element = elementsRef.current.get(id)
    if (!element) return null
    const rect = element.getBoundingClientRect()
    return { top: rect.top, bottom: rect.bottom }
  }, [])

  const teardownRef = React.useRef<() => void>(() => {})

  const finishPress = React.useCallback((commit: boolean) => {
    const press = pressRef.current
    if (!press) return

    if (press.started) swallowClickRef.current = true
    if (press.timer) clearTimeout(press.timer)
    press.target?.releasePointerCapture?.(press.pointerId)
    pressRef.current = null
    teardownRef.current()

    if (commit && press.started && !sameOrder(press.draft, latestRef.current.ids)) {
      latestRef.current.onReorder(press.draft)
    }

    setActiveId(null)
    setDraftOrder(null)
  }, [])

  const handleMove = React.useCallback((event: PointerEvent) => {
    const press = pressRef.current
    if (!press) return

    if (!press.started) {
      if (Math.abs(event.clientY - press.startY) > moveTolerance) finishPress(false)
      return
    }

    const targetId = press.draft.find(id => {
      const band = bandFor(id)
      return band !== null && event.clientY >= band.top && event.clientY < band.bottom
    })
    if (targetId === undefined) return

    const next = moveTo(press.draft, press.id, press.draft.indexOf(targetId))
    if (sameOrder(next, press.draft)) return

    press.draft = next
    setDraftOrder(next)
  }, [bandFor, finishPress, moveTolerance])

  const handleUp = React.useCallback(() => finishPress(true), [finishPress])
  const handleCancel = React.useCallback(() => finishPress(false), [finishPress])

  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') finishPress(false)
  }, [finishPress])

  const listen = React.useCallback(() => {
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    window.addEventListener('keydown', handleKeyDown)

    teardownRef.current = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleMove, handleUp, handleCancel, handleKeyDown])

  React.useEffect(() => () => finishPress(false), [finishPress])

  const onPointerDown = React.useCallback((id: Id) => (event: React.PointerEvent<HTMLElement>) => {
    if (event.button > 0) return
    finishPress(false)

    const target = event.currentTarget
    pressRef.current = {
      id,
      startY: event.clientY,
      pointerId: event.pointerId,
      target,
      started: false,
      draft: [...latestRef.current.ids],
      timer: setTimeout(() => {
        const press = pressRef.current
        if (!press) return
        press.started = true
        press.timer = null
        press.target?.setPointerCapture?.(press.pointerId)
        setActiveId(press.id)
        setDraftOrder(press.draft)
      }, holdMs),
    }

    listen()
  }, [finishPress, holdMs, listen])

  const onKeyDown = React.useCallback((id: Id) => (event: React.KeyboardEvent<HTMLElement>) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return

    const current = latestRef.current.ids
    const index = current.indexOf(id) + (event.key === 'ArrowDown' ? 1 : -1)
    if (index < 0 || index >= current.length) return

    event.preventDefault()
    latestRef.current.onReorder(moveTo(current, id, index))
  }, [])

  const onClick = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!swallowClickRef.current) return
    swallowClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handlersFor = React.useCallback((id: Id) => ({
    ref: (element: HTMLElement | null) => {
      if (element) elementsRef.current.set(id, element)
      else elementsRef.current.delete(id)
    },
    onPointerDown: onPointerDown(id),
    onKeyDown: onKeyDown(id),
    onClick,
  }), [onPointerDown, onKeyDown, onClick])

  return {
    order: draftOrder ?? ids,
    activeId,
    isReordering: activeId !== null,
    handlersFor,
  }
}
