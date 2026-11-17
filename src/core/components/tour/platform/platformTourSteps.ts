// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../../../types/dbTypes'

import type { ViewerKey } from '../../../types/dbTypes'
import type { TourStep } from '../tourTypes'

export const PLATFORM_TOUR_ID = 'platform'

type Translate = (key: string) => string

type ViewerChrome = 'map' | 'bim'

const chromeOf = (viewer: ViewerKey | undefined): ViewerChrome | null =>
  viewer === ViewerNames.map ? 'map' : viewer === ViewerNames.bim ? 'bim' : null

const step = (t: Translate, id: string, target: string | null, key = id): TourStep => ({
  id, target, title: t(`${key}.title`), body: t(`${key}.body`),
})

function viewerSteps(t: Translate, chrome: ViewerChrome): TourStep[] {
  return [
    step(t, 'search', 'viewer-search', `search.${chrome}`),
    step(t, 'panel', 'viewer-panel-toggle', `panel.${chrome}`),
    { ...step(t, 'toolbar', 'toolbar', `toolbar.${chrome}`), scroll: false },
  ]
}

/** The platform overview, top to bottom; the search, panel and toolbar steps only exist on the map and BIM viewers. */
export function platformTourSteps(viewer: ViewerKey | undefined, t: Translate): TourStep[] {
  const chrome = chromeOf(viewer)
  return [
    step(t, 'welcome', null),
    step(t, 'sidebar', 'sidebar'),
    step(t, 'viewers', 'sidebar-viewers'),
    ...(chrome ? viewerSteps(t, chrome) : []),
    step(t, 'data', 'sidebar-data'),
    step(t, 'plugins', 'sidebar-plugins'),
    step(t, 'support', 'sidebar-support'),
    step(t, 'account', 'sidebar-account'),
    step(t, 'done', null),
  ]
}
