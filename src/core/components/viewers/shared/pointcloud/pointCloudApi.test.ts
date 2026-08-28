// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_POINTCLOUD_API_BASE,
  pointCloudMetadataUrl,
  pointCloudOctreeSource,
  resolvePointCloudApiBase,
} from './pointCloudApi'

describe('resolvePointCloudApiBase', () => {
  it('falls back to the local service when nothing is configured', () => {
    expect(resolvePointCloudApiBase(undefined)).toBe(DEFAULT_POINTCLOUD_API_BASE)
  })

  it('ignores an empty or whitespace-only setting', () => {
    expect(resolvePointCloudApiBase('   ')).toBe(DEFAULT_POINTCLOUD_API_BASE)
  })

  it('strips a trailing slash so callers can join with one', () => {
    expect(resolvePointCloudApiBase('https://pc.example.org/')).toBe('https://pc.example.org')
  })
})

describe('pointCloudMetadataUrl', () => {
  it('addresses the record endpoint for a file', () => {
    expect(pointCloudMetadataUrl('https://pc.example.org', '669'))
      .toBe('https://pc.example.org/point-cloud/669')
  })

  it('encodes an id that would otherwise break the path', () => {
    expect(pointCloudMetadataUrl('https://pc.example.org', 'a/b'))
      .toBe('https://pc.example.org/point-cloud/a%2Fb')
  })
})

describe('pointCloudOctreeSource', () => {
  it('splits the stored key into the file name and its directory', () => {
    expect(pointCloudOctreeSource('https://pc.example.org', 'cdt', '669/potree-converted/metadata.json'))
      .toEqual({
        fileName: 'metadata.json',
        baseUrl: 'https://pc.example.org/private/cdt/669/potree-converted/',
      })
  })
})
