// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as React from 'react'

/** A `data-tour` anchor id, a function finding the element, or `null` to centre the card. */
export type TourTarget = string | (() => Element | null | undefined) | null

export interface TourStep {
  id: string
  target: TourTarget
  title: string
  /** A string splits on newlines; `term — description` lines become a definition list. */
  body: React.ReactNode
  /** Runs when the step opens, to open a panel or select something the target needs. */
  onEnter?: () => void
  /** Points an arrow at the target and ends the tour when the target is clicked. */
  invite?: boolean
  /** Whether to scroll the target into view; `false` for targets that fill the page, like a map. */
  scroll?: boolean
}

export interface GuidedTourLabels {
  next: string
  back: string
  finish: string
  hide: string
  missing: string
  progress: (step: number, total: number) => string
}

export interface GuidedTourProps {
  steps: TourStep[]
  /** Called when the viewer hides, escapes or finishes the tour. */
  onHide: () => void
  /** Elements the card must not cover, such as the panel a step points into. */
  avoid?: () => Element[]
  /** Shown at the start of the card's header, e.g. a logo. */
  header?: React.ReactNode
  labels?: Partial<GuidedTourLabels>
  /** Scopes CSS variable overrides (`--tour-accent`, …) to this tour. */
  className?: string
}

export type GuidedTourComponent = (props: GuidedTourProps) => React.ReactNode
export type TourBodyComponent = (props: { body: React.ReactNode }) => React.ReactNode

/** Remembers which tours a viewer has finished or hidden, so they do not reopen. */
export interface TourStore {
  isDone: (tourId: string) => boolean
  markDone: (tourId: string) => void
}

export type FlagStorage = Pick<Storage, 'getItem' | 'setItem'>

export interface BrowserTourStoreOptions {
  /** `session` brings the tour back in a new browser session; `local` keeps it closed on this device. */
  storage?: 'session' | 'local'
  /** Prefixes the storage key, so two plugins' tours with the same id stay apart. */
  namespace: string
}
