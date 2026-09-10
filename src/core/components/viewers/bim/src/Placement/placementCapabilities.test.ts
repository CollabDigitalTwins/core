// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { capabilitiesForFile, dropsAtOrigin } from './placementCapabilities'
import { FULL_PLACEMENT, SCALABLE_OBJECT_PLACEMENT, YAW_ONLY_PLACEMENT } from './placementTarget'

import type { DbFile } from '../../../../../types/dbTypes'

const file = (extension: string) => ({ extension }) as DbFile

describe('capabilitiesForFile', () => {
  it('gives every point cloud format full placement, e57 and copc included', () => {
    for (const extension of ['las', 'laz', 'copc', 'e57']) {
      expect(capabilitiesForFile(file(extension)), extension).toBe(FULL_PLACEMENT)
    }
  })

  it('gives 3d geometry and cad scalable placement', () => {
    expect(capabilitiesForFile(file('glb'))).toBe(SCALABLE_OBJECT_PLACEMENT)
    expect(capabilitiesForFile(file('dxf'))).toBe(SCALABLE_OBJECT_PLACEMENT)
  })

  it('gives everything else yaw only', () => {
    expect(capabilitiesForFile(file('pdf'))).toBe(YAW_ONLY_PLACEMENT)
  })
})

describe('dropsAtOrigin', () => {
  it('is true for surveys, which carry their own coordinates', () => {
    for (const extension of ['las', 'laz', 'copc', 'e57', 'ifc', 'frag']) {
      expect(dropsAtOrigin(file(extension)), extension).toBe(true)
    }
  })

  it('is false for anything the user has to point at', () => {
    for (const extension of ['glb', 'dxf', 'pdf', 'png']) {
      expect(dropsAtOrigin(file(extension)), extension).toBe(false)
    }
  })
})
