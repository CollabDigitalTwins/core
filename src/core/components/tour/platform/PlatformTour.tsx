'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useMenusContext } from '../../../store'
import { CdtIcon } from '../../ui/Icons/CdtIcon'
import { useSidebar } from '../../ui/Sidebar'
import { GuidedTour } from '../GuidedTour'
import { PLATFORM_TOUR_PRIORITY, TourPriorityContext } from '../tourQueue'
import { browserTourStore } from '../tourStore'

import { PLATFORM_TOUR_ID } from './platformTourSteps'
import { useViewerTour } from './useViewerTour'

import type { TourStore } from '../tourStore'

const defaultStore = () => browserTourStore({ storage: 'local', namespace: 'cdt' })

/** The current viewer's tour: opens once per device on first visit, and again from Support → Guide; plugin tours wait for it. */
export function PlatformTour({ store }: { store?: TourStore }) {
  const resolved = React.useMemo(() => store ?? defaultStore(), [store])
  const { guideOpen, setGuideOpen } = useSidebar()
  const { state } = useMenusContext()
  const tour = useViewerTour(state.menus.currentViewer)

  React.useEffect(() => {
    if (!resolved.isDone(PLATFORM_TOUR_ID)) setGuideOpen(true)
  }, [resolved, setGuideOpen])

  const hide = React.useCallback(() => {
    resolved.markDone(tour.id)
    setGuideOpen(false)
  }, [resolved, tour.id, setGuideOpen])

  if (!guideOpen) return null
  return (
    <TourPriorityContext.Provider value={PLATFORM_TOUR_PRIORITY}>
      <GuidedTour key={tour.id} steps={tour.steps} onHide={hide} header={<CdtIcon monochromatic />} />
    </TourPriorityContext.Provider>
  )
}
