// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { ALL_VIEWERS, untooledViewers, viewersFor } from './viewers'

describe('viewersFor', () => {
  it('reads the viewer off a toolbar surface', () => {
    expect(viewersFor(['bim.tools'])).toEqual(['bim'])
    expect(viewersFor(['map.tools'])).toEqual(['map'])
    expect(viewersFor(['pointcloud.tools'])).toEqual(['pointcloud'])
  })

  it('treats a map layer as the map, since that is where it draws', () => {
    expect(viewersFor(['map.layers'])).toEqual(['map'])
  })

  it('collects every viewer a multi-surface plugin contributes to', () => {
    expect(viewersFor(['map.tools', 'bim.tools'])).toEqual(['map', 'bim'])
  })

  it('orders viewers consistently rather than by the order surfaces were picked', () => {
    expect(viewersFor(['bim.tools', 'map.tools'])).toEqual(['map', 'bim'])
  })

  it('does not repeat the map when two map surfaces are picked', () => {
    expect(viewersFor(['map.tools', 'map.layers'])).toEqual(['map'])
  })

  // Falls back rather than returning []: an empty list renders nowhere, omitting means all.
  it('falls back to every viewer when no surface names one', () => {
    expect(viewersFor(['viewer.tabs'])).toEqual([...ALL_VIEWERS])
    expect(viewersFor(['data.pages', 'ui.dialogs'])).toEqual([...ALL_VIEWERS])
  })
})

describe('untooledViewers', () => {
  it('names the viewers a plugin targets without contributing a tool there', () => {
    expect(untooledViewers(['bim.tools'])).toEqual(['map', 'pointcloud'])
  })

  it('is empty once every viewer has a surface', () => {
    expect(untooledViewers(['map.tools', 'bim.tools', 'pointcloud.tools'])).toEqual([])
  })
})
