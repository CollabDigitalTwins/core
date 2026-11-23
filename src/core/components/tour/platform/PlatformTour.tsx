'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { useMenusContext } from '../../../store'
import { CdtIcon } from '../../ui/Icons/CdtIcon'
import { useSidebar } from '../../ui/Sidebar'
import { GuidedTour } from '../GuidedTour'
import { PLATFORM_TOUR_PLUGINS_PRIORITY, PLATFORM_TOUR_PRIORITY, TourPriorityContext } from '../tourQueue'
import { browserTourStore } from '../tourStore'

import { PLATFORM_TOUR_ID } from './platformTourSteps'
import { usePlatformTour } from './usePlatformTour'

import type { ViewerKey } from '../../../types/dbTypes'
import type { TourStore } from '../tourStore'

const defaultStore = () => browserTourStore({ storage: 'local', namespace: 'cdt' })

const urlViewer = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('viewer'))

/** Whether the viewer is still on the page a `viewer=` link opened; moving to another page ends that for good. */
function useOnLinkedPage(viewer: ViewerKey | undefined): () => boolean {
  const linked = React.useRef<string | null | undefined>(undefined)
  if (linked.current === undefined) linked.current = urlViewer()
  const latest = React.useRef(viewer)
  latest.current = viewer
  const reached = React.useRef(false)
  React.useEffect(() => {
    if (!linked.current) return
    if (viewer === linked.current) reached.current = true
    else if (reached.current) linked.current = null
  }, [viewer])
  return React.useCallback(() => !!linked.current && latest.current === linked.current, [])
}

/** Starts the guide each time it opens: the overview on first visit or on a linked page, else the current page's own tour. */
function useStartOnOpen(open: boolean, autoOpened: React.RefObject<boolean>, onLinkedPage: () => boolean, start: (fromOverview: boolean) => void) {
  const wasOpen = React.useRef(false)
  React.useLayoutEffect(() => {
    if (open && !wasOpen.current) start(autoOpened.current || onLinkedPage())
    wasOpen.current = open
  }, [open, autoOpened, onLinkedPage, start])
}

/** The platform tour: opens once per device on first visit, and again from Support → Guide; plugin tours wait for it until the plugins section. */
export function PlatformTour({ store }: { store?: TourStore }) {
  const resolved = React.useMemo(() => store ?? defaultStore(), [store])
  const t = useTranslations('PlatformTour')
  const { guideOpen, setGuideOpen } = useSidebar()
  const { state } = useMenusContext()
  const tour = usePlatformTour(state.menus.currentViewer)
  const onLinkedPage = useOnLinkedPage(state.menus.currentViewer)
  const autoOpened = React.useRef(false)
  useStartOnOpen(guideOpen, autoOpened, onLinkedPage, tour.start)

  React.useEffect(() => {
    if (resolved.isDone(PLATFORM_TOUR_ID)) return
    autoOpened.current = true
    setGuideOpen(true)
  }, [resolved, setGuideOpen])

  const hide = React.useCallback(() => {
    resolved.markDone(PLATFORM_TOUR_ID)
    autoOpened.current = false
    setGuideOpen(false)
  }, [resolved, setGuideOpen])

  const finish = tour.returns ? tour.back : tour.continueToPage ?? hide
  const finishLabel = tour.returns ? t('backToOverview') : tour.pageLabel

  if (!guideOpen) return null
  return (
    <TourPriorityContext.Provider value={tour.yieldsToPluginTours ? PLATFORM_TOUR_PLUGINS_PRIORITY : PLATFORM_TOUR_PRIORITY}>
      <GuidedTour
        key={tour.key}
        steps={tour.steps}
        startAt={tour.startAt}
        onHide={hide}
        onFinish={finish}
        onStepChange={tour.remember}
        labels={finishLabel ? { finish: finishLabel } : undefined}
        header={<CdtIcon monochromatic />}
      />
    </TourPriorityContext.Provider>
  )
}
