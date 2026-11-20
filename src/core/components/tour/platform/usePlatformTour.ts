'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { AppConfigContext } from '../../../store'
import { ViewerNames } from '../../../types/dbTypes'
import { resolveAppContent } from '../../../utils/appContent'
import { isViewerAllowed } from '../../viewers/viewerAccess'
import { useLatest } from '../useTourLayout'

import { DATA_PAGES, platformTourSteps, VIEWERS } from './platformTourSteps'
import { subTour } from './subTourSteps'
import { followViewer, pageTourOf } from './tourRoutes'
import { usePlatformTourActions } from './usePlatformTourActions'
import { usePluginTourEntries } from './usePluginTourEntries'

import type { PageSection } from './platformTourSteps'
import type { PlatformTourActions, PlatformTourId, TourAvailability, Translate } from './platformTourTypes'
import type { Leg } from './tourRoutes'
import type { PluginTourEntries } from './usePluginTourEntries'
import type { Language, ViewerKey } from '../../../types/dbTypes'

const OVERVIEW: Leg[] = [{ tour: 'platform' }]

function useFollowViewer(viewer: ViewerKey | undefined, setTrail: React.Dispatch<React.SetStateAction<Leg[]>>) {
  const previous = React.useRef(viewer)
  React.useEffect(() => {
    if (previous.current === viewer) return
    previous.current = viewer
    setTrail(legs => followViewer(legs, viewer))
  }, [viewer, setTrail])
}

const NO_LANGUAGES: Language[] = []

function useOrganization() {
  const { state } = React.useContext(AppConfigContext)
  return state.appConfig.organization
}

function useTourAvailability(): TourAvailability {
  const organization = useOrganization()
  return React.useMemo(() => {
    const appContent = resolveAppContent(organization)
    return {
      viewers: VIEWERS.map(({ viewer }) => viewer).filter(viewer => isViewerAllowed(ViewerNames[viewer], appContent)),
      dataPages: DATA_PAGES.map(({ page }) => page).filter(page => isViewerAllowed(ViewerNames[page], appContent)),
    }
  }, [organization])
}

const rememberStep = (legs: Leg[], stepId: string): Leg[] => {
  const top = legs[legs.length - 1]
  return top.startAt === stepId ? legs : [...legs.slice(0, -1), { ...top, startAt: stepId }]
}

interface SectionContext { t: Translate; actions: PlatformTourActions; plugins: PluginTourEntries; available: TourAvailability }

function pageSection(viewer: ViewerKey | undefined, { t, actions, plugins, available }: SectionContext): PageSection | undefined {
  const tour = pageTourOf(viewer, available)
  if (!tour) return undefined
  const label = t(`welcome.shortcut.${tour.startsWith('data-') ? 'data' : tour}`)
  return { tour, label, steps: subTour(tour, t, actions, viewer, plugins, available).steps }
}

/** The overview and the closer tours its items branch into; a branch follows the viewer to other pages and returns to the step it left from. */
export function usePlatformTour(viewer: ViewerKey | undefined) {
  const t = useTranslations('PlatformTour')
  const [trail, setTrail] = React.useState<Leg[]>(OVERVIEW)

  const branch = React.useCallback((tour: PlatformTourId, returnTo: string, startAt?: string) => {
    setTrail(legs => [...legs, { tour, startAt, returnTo }])
  }, [])
  const latestViewer = useLatest(viewer)
  const back = React.useCallback(() => {
    setTrail(legs => {
      const parent = legs[legs.length - 2]
      return parent ? followViewer([...legs.slice(0, -2), { ...parent, startAt: legs[legs.length - 1].returnTo }], latestViewer.current) : legs
    })
  }, [latestViewer])
  const actions = usePlatformTourActions(branch, back)
  const plugins = usePluginTourEntries()
  const languages = (useOrganization()?.languages as Language[] | undefined) ?? NO_LANGUAGES
  const available = useTourAvailability()
  useFollowViewer(viewer, setTrail)

  const leg = trail[trail.length - 1]
  const tour = React.useMemo(() => {
    if (leg.tour !== 'platform') return subTour(leg.tour, t, actions, viewer, plugins, available)
    const section = pageSection(viewer, { t, actions, plugins, available })
    return { steps: platformTourSteps(t, actions, { languages, available, section }) }
  }, [leg.tour, viewer, t, actions, plugins, languages, available])
  const { setup } = tour
  React.useEffect(() => setup?.(), [setup])

  const reset = React.useCallback(() => setTrail(OVERVIEW), [])
  const remember = React.useCallback((stepId: string) => setTrail(legs => rememberStep(legs, stepId)), [])

  return { key: `${trail.length}:${leg.tour}`, steps: tour.steps, startAt: leg.startAt, branched: trail.length > 1, back, reset, remember }
}
