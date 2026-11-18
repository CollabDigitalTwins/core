'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { AppConfigContext } from '../../../store'
import { useLatest } from '../useTourLayout'

import { platformTourSteps } from './platformTourSteps'
import { subTour } from './subTourSteps'

import { followViewer } from './tourRoutes'
import { usePlatformTourActions } from './usePlatformTourActions'
import { usePluginTourEntries } from './usePluginTourEntries'

import type { PlatformTourId } from './platformTourTypes'
import type { Leg } from './tourRoutes'
import type { Language } from '../../../types/dbTypes'

import type { ViewerKey } from '../../../types/dbTypes'

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

function useOrganizationLanguages(): Language[] {
  const { state } = React.useContext(AppConfigContext)
  return (state.appConfig.organization?.languages as Language[] | undefined) ?? NO_LANGUAGES
}

/** The overview and the closer tours its items branch into; a branch follows the viewer to other pages and returns to the step it left from. */
export function usePlatformTour(viewer: ViewerKey | undefined) {
  const t = useTranslations('PlatformTour')
  const [trail, setTrail] = React.useState<Leg[]>(OVERVIEW)

  const branch = React.useCallback((tour: PlatformTourId, returnTo: string, startAt?: string) => {
    setTrail(legs => [...legs, { tour, startAt, returnTo }])
  }, [])
  const actions = usePlatformTourActions(branch)
  const plugins = usePluginTourEntries()
  const languages = useOrganizationLanguages()
  useFollowViewer(viewer, setTrail)

  const leg = trail[trail.length - 1]
  const tour = React.useMemo(
    () => (leg.tour === 'platform' ? { steps: platformTourSteps(viewer, t, actions, plugins, languages) } : subTour(leg.tour, t, actions, viewer, plugins)),
    [leg.tour, viewer, t, actions, plugins, languages],
  )
  const { setup } = tour
  React.useEffect(() => setup?.(), [setup])

  const latestViewer = useLatest(viewer)
  const back = React.useCallback(() => {
    setTrail(legs => {
      const parent = legs[legs.length - 2]
      return parent ? followViewer([...legs.slice(0, -2), { ...parent, startAt: legs[legs.length - 1].returnTo }], latestViewer.current) : legs
    })
  }, [latestViewer])
  const reset = React.useCallback(() => setTrail(OVERVIEW), [])

  return { key: `${trail.length}:${leg.tour}`, steps: tour.steps, startAt: leg.startAt, branched: trail.length > 1, back, reset }
}
