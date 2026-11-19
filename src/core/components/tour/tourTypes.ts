// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as React from 'react'

/** A `data-tour` anchor id, a function finding the element, or `null` to centre the card. */
export type TourTarget = string | (() => Element | null | undefined) | null

/** A row under a step's body; with `onSelect` it is a button, e.g. one that starts a tour of the part it names. */
export interface TourItem {
  id: string
  term: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  onSelect?: () => void
}

export interface TourStep {
  id: string
  target: TourTarget
  title: string
  /** A string splits on newlines; `term — description` lines become a definition list. */
  body: React.ReactNode
  items?: TourItem[]
  /** Runs when the step opens, to open a panel the target needs; a returned function runs when the step closes. */
  onEnter?: () => void | (() => void)
  /** Points an arrow at the target and ends the tour when the target is clicked. */
  invite?: boolean
  /** Whether to scroll the target into view; `false` for targets that fill the page, like a map. */
  scroll?: boolean
  /** A small button at the top of the card, e.g. one that skips to the tour of the page the viewer is on. */
  shortcut?: { label: string; onSelect: () => void }
  /** Checked when Next or Back would reach the step; `true` passes over it, e.g. a hint for a state the page is not in. */
  skip?: () => boolean
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
  /** Called by Finish on the last step instead of `onHide`, e.g. to return to the tour this one branched from. */
  onFinish?: () => void
  /** Called with the id of each step as it opens, e.g. to reopen on it if the tour remounts. */
  onStepChange?: (stepId: string) => void
  /** The id of the step to open on; the first step when absent or unknown. */
  startAt?: string
  /** Elements the card must not cover, such as the panel a step points into. */
  avoid?: () => Element[]
  /** Shown at the start of the card's header, e.g. a logo. */
  header?: React.ReactNode
  labels?: Partial<GuidedTourLabels>
  /** Scopes CSS variable overrides (`--tour-accent`, …) to this tour. */
  className?: string
}
