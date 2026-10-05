// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { DatasetGroup } from '../../types/dbTypes'

import { toPluginDataset } from './toPluginDataset'

import type { PluginContribution } from './provider'

const contribution = (overrides: Partial<PluginContribution<'map.datasets'>> = {}): PluginContribution<'map.datasets'> => ({
  pluginId: 'wildfire',
  id: 'fires',
  name: 'Active fires',
  ...overrides,
})

describe('toPluginDataset', () => {
  it('namespaces the id by plugin, so two plugins never collide', () => {
    expect(toPluginDataset(contribution()).id).toBe('plugin:wildfire:fires')
  })

  it('lists a dataset as organizational data of the viewer’s own organization', () => {
    const dataset = toPluginDataset(contribution(), 7)

    expect(dataset.group).toBe(DatasetGroup.Organizational)
    expect(dataset.organization).toBe(7)
    expect(dataset.portal?.live).toBe(false)
  })

  it('lists a live dataset under Live Data and not as organizational', () => {
    const dataset = toPluginDataset(contribution({ live: true }), 7)

    expect(dataset.portal?.live).toBe(true)
    expect(dataset.group).not.toBe(DatasetGroup.Organizational)
    expect(dataset.organization).toBeUndefined()
  })

  it('leaves drawing to the plugin when it names no source', () => {
    expect(toPluginDataset(contribution()).drawnByPlugin).toBe('wildfire')
  })

  it('hands a WMS source to core’s WMS layer, time dimension included', () => {
    const dataset = toPluginDataset(contribution({
      source: { type: 'wms', baseUrl: 'https://example.org/wms', layers: 'RADAR', timeEnabled: true },
    }))

    expect(dataset.datasetType).toBe('WMS')
    expect(dataset.url).toContain('LAYERS=RADAR')
    expect(dataset.wms).toEqual({ baseUrl: 'https://example.org/wms', layers: 'RADAR' })
    expect(dataset.timeEnabled).toBe(true)
    expect(dataset.drawnByPlugin).toBeUndefined()
  })

  it('serves a GeoJSON source’s features through getFeatures', async () => {
    const features = { type: 'FeatureCollection' as const, features: [] }
    const dataset = toPluginDataset(contribution({ source: { type: 'geojson', getFeatures: async () => features } }))

    expect(dataset.datasetType).toBe('GeoJSON')
    await expect(dataset.getFeatures()).resolves.toBe(features)
  })
})
