'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ViewerNames } from '../../../types/dbTypes'
import { useLatest } from '../useTourLayout'

import type { ViewerKey } from '../../../types/dbTypes'

const loadedViewer = () =>
  (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('viewer') ?? ViewerNames.map)

/** Whether the viewer is still on the page the platform loaded on; moving to another page ends that until the next load. */
export function useOnLandingPage(viewer: ViewerKey | undefined): () => boolean {
  const landing = React.useRef<string | null | undefined>(undefined)
  if (landing.current === undefined) landing.current = loadedViewer()
  const latest = useLatest(viewer)
  const reached = React.useRef(false)
  React.useEffect(() => {
    if (!landing.current) return
    if (viewer === landing.current) reached.current = true
    else if (reached.current) landing.current = null
  }, [viewer])
  return React.useCallback(() => !!landing.current && latest.current === landing.current, [latest])
}

/** Starts the guide each time it opens: the overview on first visit or on the landing page, else the current page's own tour. */
export function useStartOnOpen(open: boolean, autoOpened: React.RefObject<boolean>, onLandingPage: () => boolean, start: (fromOverview: boolean) => void) {
  const wasOpen = React.useRef(false)
  React.useLayoutEffect(() => {
    if (open && !wasOpen.current) start(autoOpened.current || onLandingPage())
    wasOpen.current = open
  }, [open, autoOpened, onLandingPage, start])
}
