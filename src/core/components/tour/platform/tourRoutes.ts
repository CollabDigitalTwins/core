// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ViewerNames } from '../../../types/dbTypes'

import { chromeOf } from './platformTourSteps'
import { dataPageOf, panelTabOf } from './subTourSteps'

import type { PlatformTourId, TourAvailability } from './platformTourTypes'
import type { ViewerKey } from '../../../types/dbTypes'

type SubTourId = Exclude<PlatformTourId, 'platform'>

export interface Leg { tour: PlatformTourId; startAt?: string; returnTo?: string }

const hasSidePanel = (viewer: ViewerKey | undefined) => viewer === ViewerNames.map || viewer === ViewerNames.bim

/** Whether a closer tour still applies on `viewer`; side panel tabs exist on both the map and BIM viewers. */
export function tourFits(tour: SubTourId, viewer: ViewerKey | undefined): boolean {
  if (tour === 'explore-viewers' || tour === 'explore-data') return true
  if (panelTabOf(tour) || tour === 'tools') return hasSidePanel(viewer)
  if (tour === 'bim' || tour === 'settings' || tour === 'plugins') return viewer === tour
  return viewer === (dataPageOf(tour) ?? ViewerNames.map)
}

/** The closer tour for a viewer or page, or null when it has none. */
export function tourOfViewer(viewer: ViewerKey | undefined): SubTourId | null {
  if (viewer === ViewerNames.map || viewer === ViewerNames.bim || viewer === ViewerNames.settings || viewer === ViewerNames.plugins) return viewer
  const page = dataPageOf(`data-${String(viewer)}` as SubTourId)
  return page ? `data-${page}` : null
}

/** The viewer or data page tour for where the viewer is now, when this organization shows that page. */
export function pageTourOf(viewer: ViewerKey | undefined, available: TourAvailability): SubTourId | null {
  const chrome = chromeOf(viewer)
  if (chrome) return available.viewers.includes(chrome) ? chrome : null
  const page = dataPageOf(`data-${String(viewer)}` as SubTourId)
  return page && available.dataPages.includes(page) ? `data-${page}` : null
}

/** Swaps a branch for the tour of the page the viewer moved to, or returns to the overview when that page has none. */
export function followViewer(legs: Leg[], viewer: ViewerKey | undefined): Leg[] {
  const top = legs[legs.length - 1]
  if (top.tour === 'platform' || tourFits(top.tour, viewer)) return legs
  const [overview, firstBranch] = legs
  const next = tourOfViewer(viewer)
  return next
    ? [overview, { tour: next, returnTo: firstBranch.returnTo }]
    : [{ ...overview, startAt: firstBranch.returnTo }]
}
