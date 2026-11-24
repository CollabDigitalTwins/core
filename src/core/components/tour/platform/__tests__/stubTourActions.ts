// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { vi } from 'vitest'

import type { PlatformTourActions } from '../platformTourTypes'

const cleanup = () => vi.fn(() => () => {})

/** Actions that allow everything in Ottawa and record every call; override what a test needs. */
export const stubTourActions = (overrides: Partial<PlatformTourActions> = {}): PlatformTourActions => ({
  can: () => true,
  inOttawa: () => true,
  canDemoSearch: () => true,
  zoningApplied: () => false,
  isMobile: () => false,
  branch: vi.fn(), leave: vi.fn(), openViewer: vi.fn(), openMenu: cleanup(), openPanel: cleanup(), selectPanelTab: vi.fn(),
  demoSearch: cleanup(), demoMeasure: cleanup(), pressControl: vi.fn(), openFeatureRequest: vi.fn(), openContactPage: vi.fn(), switchLanguage: vi.fn(), openBugReport: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), resetNorth: vi.fn(),
  mapStyles: [], setMapStyle: vi.fn(), demoMapStyle: cleanup(), demoZoning: cleanup(), demoZoningMenu: cleanup(),
  demoHelloMap: cleanup(), toggleHelloMapControl: vi.fn(),
  sensorTypesExist: () => true, demoComment: cleanup(), demoSensor: cleanup(),
  ...overrides,
})
