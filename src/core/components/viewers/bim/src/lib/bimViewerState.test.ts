// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { nextBimViewerState } from './bimViewerState'

import type { BimViewerStateInputs } from './bimViewerState'

const ready: BimViewerStateInputs = {
  hasComponents: true,
  hasBuildingId: true,
  hasBuilding: true,
  buildingLoading: false,
  buildingError: false,
  filesLoading: false,
  filesError: false,
  bimFileCount: 2,
  hasLoadedModels: false,
}

describe('nextBimViewerState', () => {
  it('waits while the viewer world is still being built', () => {
    expect(nextBimViewerState({ ...ready, hasComponents: false })).toEqual({ state: 'opening', resetLoadedModels: true })
  })

  it('waits while the building is being fetched', () => {
    expect(nextBimViewerState({ ...ready, buildingLoading: true })).toEqual({ state: 'opening' })
  })

  it('asks for a building when none is selected', () => {
    const inputs = { ...ready, hasBuildingId: false, hasBuilding: false }
    expect(nextBimViewerState(inputs)).toEqual({ state: 'noBuilding', resetLoadedModels: true })
  })

  it('asks for a building when the building fetch failed', () => {
    expect(nextBimViewerState({ ...ready, buildingError: true })).toEqual({ state: 'noBuilding', resetLoadedModels: true })
  })

  it('waits while the file list is being fetched', () => {
    expect(nextBimViewerState({ ...ready, filesLoading: true })).toEqual({ state: 'opening' })
  })

  it('loads the models once the files are known', () => {
    expect(nextBimViewerState(ready)).toEqual({ state: 'loading', loadModels: true })
  })

  it('offers an upload when the building genuinely has no BIM files', () => {
    expect(nextBimViewerState({ ...ready, bimFileCount: 0 })).toEqual({ state: 'noBimFiles' })
  })

  it('reports a failed file list as unavailable, not as an empty building', () => {
    const inputs = { ...ready, filesError: true, bimFileCount: 0 }
    expect(nextBimViewerState(inputs)).toEqual({ state: 'filesUnavailable' })
  })

  it('prefers the files it did get over reporting the fetch failure', () => {
    const inputs = { ...ready, filesError: true, bimFileCount: 1 }
    expect(nextBimViewerState(inputs)).toEqual({ state: 'loading', loadModels: true })
  })

  it('leaves a finished load alone', () => {
    expect(nextBimViewerState({ ...ready, hasLoadedModels: true })).toBeNull()
  })

  it('does not re-report a failed file list once models are up', () => {
    const inputs = { ...ready, hasLoadedModels: true, filesError: true, bimFileCount: 0 }
    expect(nextBimViewerState(inputs)).toBeNull()
  })

  it('keeps waiting on the world even when everything else failed', () => {
    const inputs = { ...ready, hasComponents: false, buildingError: true, filesError: true }
    expect(nextBimViewerState(inputs)).toEqual({ state: 'opening', resetLoadedModels: true })
  })
})
