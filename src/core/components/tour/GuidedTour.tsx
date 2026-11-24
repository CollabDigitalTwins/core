'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { List } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { createPortal } from 'react-dom'

import { placeCard, visiblePart } from './placement'
import { TourBody } from './TourBody'
import { TourItems } from './TourItems'
import { useTourTurn } from './tourQueue'
import { TourSectionsDialog } from './TourSectionsDialog'
import { TOUR_CSS } from './tourStyles'
import { cardWidthFor, HIDE_BUTTON_CLASS, useFinishOnClick, useLatest, useMeasuredHeight, useTourKeys, useTourLayout, useViewportSize } from './useTourLayout'

import type { Box } from './placement'
import type { GuidedTourLabels, GuidedTourProps, TourSection, TourStep } from './tourTypes'

const SPOT_PADDING = 6
const ARROW_GAP = 10
const ARROW_SIZE = { width: 44, height: 32 }
const FALLBACK_CARD_HEIGHT = 280
const TARGET_WAIT_MS = 4000

const padded = (box: Box): Box => ({
  left: box.left - SPOT_PADDING, top: box.top - SPOT_PADDING,
  width: box.width + SPOT_PADDING * 2, height: box.height + SPOT_PADDING * 2,
})

const arrowBox = (spot: Box): Box => ({ left: spot.left + spot.width + ARROW_GAP, top: spot.top + spot.height / 2 - ARROW_SIZE.height / 2, ...ARROW_SIZE })

const settledClass = (base: string, settled: boolean) => (settled ? `${base} is-settled` : base)

function useLabels(overrides: Partial<GuidedTourLabels> | undefined): GuidedTourLabels {
  const t = useTranslations('GuidedTour')
  return {
    next: t('next'),
    back: t('back'),
    finish: t('finish'),
    hide: t('hide'),
    missing: t('missing'),
    progress: (step, total) => t('progress', { step, total }),
    ...overrides,
  }
}

function useIsClient() {
  const [client, setClient] = React.useState(false)
  React.useEffect(() => setClient(true), [])
  return client
}

function useStepEntry(index: number, onEnter: TourStep['onEnter']) {
  const latest = useLatest(onEnter)
  React.useEffect(() => latest.current?.() ?? undefined, [index, latest])
}

/** Whether the step is still worth waiting on for its target, which can mount late; resets on every step. */
function useWaitingForTarget(index: number, missing: boolean): boolean {
  const [timedOut, setTimedOut] = React.useState(false)
  React.useEffect(() => {
    setTimedOut(false)
    const timer = window.setTimeout(() => setTimedOut(true), TARGET_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [index])
  return missing && !timedOut
}

function TargetSkeleton({ label }: { label: string }) {
  return (
    <div className="cdt-tour-waiting" role="status">
      <span /><span />
      <span className="cdt-tour-sr">{label}</span>
    </div>
  )
}

/** Focuses `ref` on open and hands focus back to whatever had it when the tour closes. */
function useFocusHandoff(ref: React.RefObject<HTMLElement | null>, mounted: boolean) {
  React.useEffect(() => {
    if (!mounted) return
    const previous = document.activeElement
    ref.current?.focus({ preventScroll: true })
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true })
    }
  }, [ref, mounted])
}

/** The next step in `delta`'s direction that does not ask to be skipped, or null past either end. */
function nextIndex(steps: TourStep[], from: number, delta: number): number | null {
  for (let i = from + delta; i >= 0 && i < steps.length; i += delta) {
    if (!steps[i].skip?.()) return i
  }
  return null
}

function useStepReport(stepId: string, onStepChange: GuidedTourProps['onStepChange']) {
  const latest = useLatest(onStepChange)
  React.useEffect(() => latest.current?.(stepId), [stepId, latest])
}

const HOST_PRESS_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'touchmove', 'wheel'] as const

// Radix menus close on presses that reach `document`, and modal dialogs block scrolls there.
function useHostPressShield() {
  const [root, setRoot] = React.useState<HTMLDivElement | null>(null)
  React.useEffect(() => {
    if (!root) return
    const stop = (event: Event) => event.stopPropagation()
    HOST_PRESS_EVENTS.forEach(type => root.addEventListener(type, stop, { passive: true }))
    return () => HOST_PRESS_EVENTS.forEach(type => root.removeEventListener(type, stop))
  }, [root])
  return setRoot
}

const NO_STEP = () => {}

/** Whether the sections dialog is open; closing it hands focus back to the card's button that opened it. */
function useSectionsDialog() {
  const [open, setOpen] = React.useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const wasOpen = React.useRef(false)
  React.useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus({ preventScroll: true })
    wasOpen.current = open
  }, [open])
  const show = React.useCallback(() => setOpen(true), [])
  const close = React.useCallback(() => setOpen(false), [])
  return { open, buttonRef, show, close }
}

/** A step-by-step guide that spotlights parts of the page while leaving it usable underneath; open tours show one at a time. */
export function GuidedTour(props: GuidedTourProps) {
  return useTourTurn() ? <ActiveTour {...props} /> : null
}

function ActiveTour({ steps, onHide, onFinish = onHide, onStepChange, startAt, avoid, header, sections, labels, className }: GuidedTourProps) {
  const text = useLabels(labels)
  const sectionsLabel = useTranslations('GuidedTour.sections')('open')
  const titleId = React.useId()
  const [index, setIndex] = React.useState(() => Math.max(0, steps.findIndex(s => s.id === startAt)))
  const step = steps[Math.min(index, steps.length - 1)]
  const last = nextIndex(steps, index, 1) === null
  const layout = useTourLayout(index, step, avoid)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const nextRef = React.useRef<HTMLButtonElement>(null)
  const cardHeight = useMeasuredHeight(cardRef, FALLBACK_CARD_HEIGHT)
  const client = useIsClient()
  const viewport = useViewportSize()

  const waiting = useWaitingForTarget(index, step.target !== null && !layout.target)
  useStepEntry(index, step.onEnter)
  useFocusHandoff(nextRef, client)

  const go = React.useCallback((delta: number) => {
    const next = nextIndex(steps, index, delta)
    if (next === null) {
      if (delta > 0) onFinish()
    } else setIndex(next)
  }, [steps, index, onFinish])
  useStepReport(step.id, onStepChange)
  const rootRef = useHostPressShield()
  const dialog = useSectionsDialog()
  const jump = (section: TourSection, stepId: string) => {
    dialog.close()
    if (section.id !== sections?.current) return section.start(stepId)
    const target = steps.findIndex(s => s.id === stepId)
    if (target >= 0) setIndex(target)
  }
  useTourKeys(dialog.open ? NO_STEP : go, dialog.open ? dialog.close : onHide)
  useFinishOnClick(index, step, onHide)

  if (!client) return null

  if (sections && dialog.open) {
    return createPortal(
      <div ref={rootRef} className={className ? `cdt-tour ${className}` : 'cdt-tour'}>
        <style>{TOUR_CSS}</style>
        <div className="cdt-tour-scrim" />
        <TourSectionsDialog sections={sections} currentStep={step.id} onPick={jump} onBack={dialog.close} />
      </div>,
      document.body,
    )
  }

  const visible = layout.target && visiblePart(layout.target, viewport)
  const spot = visible && padded(visible)
  const arrow = step.invite && spot ? arrowBox(spot) : null
  const card = placeCard(spot, { width: cardWidthFor(viewport.width), height: cardHeight }, viewport, arrow ? [...layout.avoid, arrow] : layout.avoid)

  return createPortal(
    <div ref={rootRef} className={className ? `cdt-tour ${className}` : 'cdt-tour'}>
      <style>{TOUR_CSS}</style>
      {spot ? <div className={settledClass('cdt-tour-spot', layout.settled)} style={spot} /> : <div className="cdt-tour-scrim" />}
      {spot && <div className={settledClass('cdt-tour-ring', layout.settled)} style={spot} />}
      {arrow && <div className={settledClass('cdt-tour-arrow', layout.settled)} style={arrow} aria-hidden>←</div>}

      <button type="button" className={HIDE_BUTTON_CLASS} onClick={onHide}>
        <span aria-hidden>×</span>{text.hide}
      </button>

      <div ref={cardRef} className={settledClass('cdt-tour-card', layout.settled)} role="dialog" aria-modal="false" aria-labelledby={titleId} style={{ left: card.left, top: card.top, maxHeight: card.maxHeight }}>
        <header>
          {header}
          {sections && (
            <button ref={dialog.buttonRef} type="button" className="cdt-tour-sections-open" aria-label={sectionsLabel} title={sectionsLabel} onClick={dialog.show}>
              <List aria-hidden />
            </button>
          )}
          {step.shortcut && <button type="button" className="cdt-tour-shortcut" onClick={step.shortcut.onSelect}>{step.shortcut.label} ›</button>}
          <small>{text.progress(index + 1, steps.length)}</small>
        </header>
        <div className="cdt-tour-body" aria-live="polite">
          <h3 id={titleId}>{step.title}</h3>
          <TourBody body={step.body} />
          {step.items && <TourItems items={step.items} />}
          {waiting && <TargetSkeleton label={text.missing} />}
        </div>
        <footer>
          <div className="cdt-tour-dots">
            {steps.map((s, i) => (
              <button key={s.id} type="button" aria-label={s.title} aria-current={i === index ? 'step' : undefined} onClick={() => setIndex(i)} />
            ))}
          </div>
          <div className="cdt-tour-actions">
            <button type="button" className="cdt-tour-back" disabled={index === 0} onClick={() => go(-1)}>{text.back}</button>
            <button ref={nextRef} type="button" className="cdt-tour-next" onClick={() => go(1)}>{last ? text.finish : text.next}</button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
