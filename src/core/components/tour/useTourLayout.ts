'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { fitsBeside, intersect } from './placement'

import type { Box } from './placement'
import type { TourStep, TourTarget } from './tourTypes'

const SETTLE_FRAMES = 10
const MAX_SETTLE_FRAMES = 60
const CARD_WIDTH = 360
const CARD_INSET = 32
export const HIDE_BUTTON_CLASS = 'cdt-tour-hide'

export interface TourLayout { target: Box | null; avoid: Box[]; settled: boolean }

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (a !== null && b !== null && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height)
const sameLayout = (a: TourLayout, b: TourLayout) =>
  a.settled === b.settled && sameBox(a.target, b.target) && a.avoid.length === b.avoid.length && a.avoid.every((box, i) => sameBox(box, b.avoid[i]))

export const cardWidthFor = (viewportWidth: number) => Math.min(CARD_WIDTH, viewportWidth - CARD_INSET)

const scrollBehavior = (): ScrollBehavior => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

const rendered = (element: Element | null | undefined) => (element && element.getClientRects().length > 0 ? element : null)

const boxOf = (element: Element): Box => {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { left, top, width, height }
}

/** The rendered element a step points at, or null when it is absent or hidden. */
export function resolveTarget(target: TourTarget): Element | null {
  if (target === null) return null
  if (typeof target === 'function') return rendered(target())
  return rendered(document.querySelector(`[data-tour="${target.replace(/["\\]/g, '\\$&')}"]`))
}

/** Tall targets and targets too wide to sit beside go to the top, leaving the card the room below. */
function scrollBlock(element: Element): ScrollLogicalPosition {
  const box = boxOf(element)
  return box.height > window.innerHeight || !fitsBeside(box, cardWidthFor(window.innerWidth), window.innerWidth) ? 'start' : 'nearest'
}

/** The target's box cut to the scrolling boxes around it, so a half-scrolled row is lit only where it shows. */
function shownBox(element: Element): Box | null {
  let box: Box | null = boxOf(element)
  for (let parent = element.parentElement; parent && box; parent = parent.parentElement) {
    if (getComputedStyle(parent).overflowY !== 'visible') box = intersect(box, boxOf(parent))
  }
  return box
}

function avoidBoxes(avoid: (() => Element[]) | undefined): Box[] {
  const elements = [...(avoid?.() ?? []), document.querySelector(`.${HIDE_BUTTON_CLASS}`)]
  return elements.map(rendered).flatMap(element => (element ? [boxOf(element)] : []))
}

/** Always the latest value, so effects keyed on the step index read fresh callbacks without re-running. */
export function useLatest<T>(value: T) {
  const ref = React.useRef(value)
  ref.current = value
  return ref
}

/** Followed every frame because panels scroll, dropdowns open and content mounts late; settled once it holds still. */
export function useTourLayout(stepIndex: number, step: TourStep, avoid: (() => Element[]) | undefined): TourLayout {
  const [layout, setLayout] = React.useState<TourLayout>({ target: null, avoid: [], settled: false })
  const latest = useLatest({ step, avoid })
  React.useEffect(() => {
    let frame = 0
    let scrolled = false
    let stillFrames = 0
    let frames = 0
    let last: TourLayout | null = null
    let settled = false
    const follow = () => {
      const { step: current, avoid: currentAvoid } = latest.current
      const element = resolveTarget(current.target)
      if (element && !scrolled && current.scroll !== false) element.scrollIntoView({ block: scrollBlock(element), behavior: scrollBehavior() })
      scrolled ||= element !== null
      const measured = { target: element && shownBox(element), avoid: avoidBoxes(currentAvoid), settled: false }
      stillFrames = last && sameLayout(last, measured) ? stillFrames + 1 : 0
      last = measured
      settled ||= stillFrames >= SETTLE_FRAMES || ++frames >= MAX_SETTLE_FRAMES
      const next = { ...measured, settled }
      setLayout(previous => (sameLayout(previous, next) ? previous : next))
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
  }, [stepIndex, latest])
  return layout
}

/** Ends the tour when an invited target is clicked, so it does not return when the viewer comes back. */
export function useFinishOnClick(stepIndex: number, step: TourStep, onHide: () => void) {
  const latest = useLatest({ step, onHide })
  const invite = step.invite === true
  React.useEffect(() => {
    if (!invite) return
    const onClick = (event: MouseEvent) => {
      const { step: current, onHide: hide } = latest.current
      if (event.target instanceof Node && resolveTarget(current.target)?.contains(event.target)) hide()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [stepIndex, invite, latest])
}

const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && target.closest('input, select, textarea, [contenteditable="true"]') !== null
const inHostDialog = (target: EventTarget | null) => target instanceof HTMLElement && target.closest('[role="dialog"]:not(.cdt-tour-card)') !== null

export function useTourKeys(go: (delta: number) => void, onHide: () => void) {
  const latest = useLatest({ go, onHide })
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return
      if (event.key === 'ArrowRight') latest.current.go(1)
      else if (event.key === 'ArrowLeft') latest.current.go(-1)
      else if (event.key === 'Escape' && !inHostDialog(event.target)) latest.current.onHide()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [latest])
}

export function useMeasuredHeight(ref: React.RefObject<HTMLElement | null>, fallback: number): number {
  const [height, setHeight] = React.useState(fallback)
  React.useLayoutEffect(() => {
    const measured = ref.current?.scrollHeight
    if (measured && measured !== height) setHeight(measured)
  })
  return height
}
