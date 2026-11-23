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
import { dataPageOf, subTour } from './subTourSteps'
import { followViewer, pageTourOf, yieldsToPluginTours } from './tourRoutes'
import { usePlatformTourActions } from './usePlatformTourActions'
import { usePluginTourEntries } from './usePluginTourEntries'

import type { PageSection } from './platformTourSteps'
import type { PlatformTourId, TourAvailability, Translate } from './platformTourTypes'
import type { SubTour } from './subTourSteps'
import type { Leg } from './tourRoutes'
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

function pageSection(viewer: ViewerKey | undefined, t: Translate, available: TourAvailability): PageSection | undefined {
  const tour = pageTourOf(viewer, available)
  if (!tour) return undefined
  const page = dataPageOf(tour)
  return { tour, label: page ? t('welcome.shortcut.data', { page: t(`data.items.${page}.term`) }) : t(`welcome.shortcut.${tour}`) }
}

const onPage = (section: PageSection | undefined): Leg[] =>
  section ? [OVERVIEW[0], { tour: section.tour, chained: true }] : OVERVIEW

/** The overview, the current page's tour it continues into, and the closer tours its items branch into; a branch returns to the step it left from. */
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
  const section = React.useMemo(() => pageSection(viewer, t, available), [viewer, t, available])
  const latestSection = useLatest(section)
  const start = React.useCallback((fromOverview: boolean) => setTrail(fromOverview ? OVERVIEW : onPage(latestSection.current)), [latestSection])
  const tour = React.useMemo((): SubTour => {
    if (leg.tour === 'platform') return { steps: platformTourSteps(t, actions, { languages, available, section }) }
    const closer = subTour(leg.tour, t, actions, viewer, plugins, available)
    const toOverview = { label: t('overviewShortcut'), onSelect: () => start(true) }
    return { ...closer, steps: closer.steps.map(s => ({ shortcut: toOverview, ...s })) }
  }, [leg.tour, viewer, t, actions, plugins, languages, available, section, start])
  const { setup } = tour
  React.useEffect(() => setup?.(), [setup])

  const remember = React.useCallback((stepId: string) => setTrail(legs => rememberStep(legs, stepId)), [])

  const overview = leg.tour === 'platform'
  return {
    key: `${trail.length}:${leg.tour}`,
    steps: tour.steps,
    startAt: leg.startAt,
    returns: trail.length > 1 && !leg.chained,
    pageLabel: overview ? section?.label : undefined,
    yieldsToPluginTours: yieldsToPluginTours(leg),
    back,
    start,
    continueToPage: overview && section ? () => start(false) : undefined,
    remember,
  }
}
