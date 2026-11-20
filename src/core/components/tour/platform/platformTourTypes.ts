// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { HelloMapControl, HelloMapStage } from './helloMapDemo'
import type { ZoningMenuStage, ZoningStage } from './zoningDemo'
import type { SidebarTabKey, SidebarTabType } from '../../../store/Menus/reducer'
import type { Language, ViewerKey } from '../../../types/dbTypes'
import type { MapStyle } from '../../../types/map'

export type Translate = (key: string) => string

export type ViewerChrome = 'map' | 'bim'

export type DataPage = 'sites' | 'buildings' | 'files' | 'infrastructure'

export type MeasureKind = 'distance' | 'area'

export type PlatformTourId =
  | 'platform' | ViewerChrome | 'tools' | 'explore-viewers' | 'explore-data' | 'settings' | 'plugins' | 'datasets' | 'measure'
  | `data-${DataPage}` | `panel-${SidebarTabType}`

/** The viewers and data pages this organization shows, so the tour never offers one it lacks. */
export interface TourAvailability {
  viewers: ViewerChrome[]
  dataPages: DataPage[]
}

/** What a step's buttons and entry callbacks can do to the app, and what the viewer's role allows. */
export interface PlatformTourActions {
  can: (action: string, subject: string) => boolean
  inOttawa: () => boolean
  canDemoSearch: () => boolean
  zoningApplied: () => boolean
  branch: (tour: PlatformTourId, returnTo: string, startAt?: string) => void
  leave: () => void
  openViewer: (viewer: ViewerKey) => void
  openPanel: () => () => void
  selectPanelTab: (tab: SidebarTabKey) => void
  demoSearch: () => () => void
  demoMeasure: (kind: MeasureKind, inOttawa: boolean) => () => void
  pressControl: (anchor: string) => void
  openFeatureRequest: () => void
  openContactPage: () => void
  switchLanguage: (language: Language) => void
  openBugReport: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetNorth: () => void
  mapStyles: MapStyle[]
  setMapStyle: (url: string) => void
  demoMapStyle: () => () => void
  demoZoning: (stage: ZoningStage) => () => void
  demoZoningMenu: (stage: ZoningMenuStage) => () => void
  demoHelloMap: (stage: HelloMapStage) => () => void
  toggleHelloMapControl: (control: HelloMapControl) => void
}
