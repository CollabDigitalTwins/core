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
import { useOnLandingPage, useStartOnOpen } from './useGuideStart'
import { usePlatformTour } from './usePlatformTour'

import type { TourStore } from '../tourStore'

const defaultStore = () => browserTourStore({ storage: 'local', namespace: 'cdt' })

/** The platform tour: opens once per device on first visit, and again from Support → Guide; plugin tours wait for it until the plugins section. */
export function PlatformTour({ store }: { store?: TourStore }) {
  const resolved = React.useMemo(() => store ?? defaultStore(), [store])
  const t = useTranslations('PlatformTour')
  const { guideOpen, setGuideOpen } = useSidebar()
  const { state } = useMenusContext()
  const tour = usePlatformTour(state.menus.currentViewer)
  const onLandingPage = useOnLandingPage(state.menus.currentViewer)
  const autoOpened = React.useRef(false)
  useStartOnOpen(guideOpen, autoOpened, onLandingPage, tour.start)

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
        sections={tour.sections}
      />
    </TourPriorityContext.Provider>
  )
}
