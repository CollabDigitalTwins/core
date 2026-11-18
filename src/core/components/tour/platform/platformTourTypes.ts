// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { SidebarTabKey, SidebarTabType } from '../../../store/Menus/reducer'
import type { Language, ViewerKey } from '../../../types/dbTypes'

export type Translate = (key: string) => string

export type ViewerChrome = 'map' | 'bim'

export type DataPage = 'sites' | 'buildings' | 'files' | 'infrastructure'

export type MeasureKind = 'distance' | 'area'

export type PlatformTourId = 'platform' | ViewerChrome | 'settings' | 'plugins' | 'datasets' | 'measure' | `data-${DataPage}` | `panel-${SidebarTabType}`

/** What a step's buttons and entry callbacks can do to the app, and what the viewer's role allows. */
export interface PlatformTourActions {
  can: (action: string, subject: string) => boolean
  branch: (tour: PlatformTourId, returnTo: string, startAt?: string) => void
  openViewer: (viewer: ViewerKey) => void
  openPanel: () => () => void
  selectPanelTab: (tab: SidebarTabKey) => void
  demoSearch: () => () => void
  demoMeasure: (kind: MeasureKind) => () => void
  pressControl: (anchor: string) => void
  openFeatureRequest: () => void
  emailTeam: () => void
  switchLanguage: (language: Language) => void
  openBugReport: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetNorth: () => void
}
