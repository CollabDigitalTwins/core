// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

// jsdom can't load @thatopen/components; these are only used as bimComponents.get() keys.
vi.mock('../../../../PointClouds', () => ({ BimPointClouds: class {} }))
vi.mock('../../../../Splats', () => ({ BimSplats: class {} }))
vi.mock('../../../../ModelManager', () => ({ ModelManager: class {} }))
vi.mock('../../../../DXFLoader', () => ({ DXFManager: class {} }))
vi.mock('../../../../Highlighter', () => ({ Highlighter: class {} }))
vi.mock('../../../../CurrentWorld', () => ({ CurrentWorld: class {} }))
vi.mock('../../../../Cursor', () => ({ Cursor: class {} }))
vi.mock('../../../../BCFTopicsManager', () => ({ BCFTopicsManager: class {} }))
vi.mock('../../../../IDSManager', () => ({ IDSManager: class {} }))
vi.mock('../../../../Placement/PlacementEditor', () => ({ PlacementEditor: class {} }))
vi.mock('../../../../Placement/AnimationSession', () => ({ AnimationSession: class {} }))
vi.mock('../../../../SceneObjects', () => ({ BimSceneObjects: class {} }))

import { OPTIONS_PLACEABLE, OPTIONS_PLAIN } from './FilesSection'
import { MODEL_OPTIONS } from './ModelsSection'
import { SPLAT_OPTIONS } from './SplatRows'

describe('BIM file row options', () => {
  it('never offers download', () => {
    for (const options of [OPTIONS_PLACEABLE, OPTIONS_PLAIN, MODEL_OPTIONS, SPLAT_OPTIONS]) {
      expect(options).not.toContain('download')
    }
  })

  it('keeps every other action each row had', () => {
    expect(OPTIONS_PLACEABLE).toEqual(['view', 'move', 'info', 'delete'])
    expect(OPTIONS_PLAIN).toEqual(['view', 'delete'])
    expect(MODEL_OPTIONS).toEqual(['view', 'move', 'info', 'delete'])
    expect(SPLAT_OPTIONS).toEqual(['view', 'ghost', 'move', 'info', 'delete'])
  })
})
