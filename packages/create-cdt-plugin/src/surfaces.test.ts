// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { SURFACES } from './options'
import { capabilityConstant } from './render'
import { factsFor } from './surfaces'

describe('factsFor', () => {
  it('points each surface at the kit type entry that names only what it needs', () => {
    expect(factsFor('map.tools').entry).toBe('@collabdt/plugin-kit/types/map')
    expect(factsFor('bim.tools').entry).toBe('@collabdt/plugin-kit/types/bim')
    expect(factsFor('pointcloud.tools').entry).toBe('@collabdt/plugin-kit/types/pointcloud')
    expect(factsFor('map.legends').entry).toBe('@collabdt/plugin-kit/types/legend')
  })

  it('agrees with capabilityConstant, which names the same entry for the token', () => {
    // The short name is stated in two places rather than derived, to keep render.ts and
    // surfaces.ts from importing each other. This is what stops the two diverging.
    for (const surface of SURFACES) {
      expect(factsFor(surface).entry).toBe(
        `@collabdt/plugin-kit/types/${capabilityConstant(surface)}`,
      )
    }
  })

  it('binds the capability registry per surface, so the wrong component is a compile error', () => {
    expect(factsFor('map.tools').contextType).toBe('MapPluginContext')
    expect(factsFor('bim.tools').contextType).toBe('BimPluginContext')
    expect(factsFor('pointcloud.tools').contextType).toBe('PointCloudPluginContext')
    expect(factsFor('map.legends').contextType).toBe('LegendPluginContext')
  })

  it('gives a type-only dependency to exactly the two surfaces that name an external type', () => {
    expect(factsFor('map.tools').typeDependency).toEqual(['maplibre-gl', '^5.24.0'])
    expect(factsFor('bim.tools').typeDependency).toEqual(['@thatopen/components', '~3.4.0'])
    expect(factsFor('pointcloud.tools').typeDependency).toBeNull()
    expect(factsFor('map.legends').typeDependency).toBeNull()
  })

  it('never names a library a plugin must not bundle as a dependency', () => {
    for (const surface of SURFACES) {
      const dependency = factsFor(surface).typeDependency

      expect(dependency?.[0]).not.toBe('three')
      expect(dependency?.[0]).not.toBe('lucide-react')
    }
  })

  it('names an icon by string for every surface, never a component', () => {
    for (const surface of SURFACES) {
      expect(factsFor(surface).icon).toMatch(/^[A-Z][A-Za-z]+$/)
    }
  })

  it('covers every offered surface', () => {
    for (const surface of SURFACES) {
      expect(() => factsFor(surface)).not.toThrow()
      expect(factsFor(surface).entry).toBeTruthy()
    }
  })

  it('gives the legend surface no toolbar props, since it registers a hook not a component', () => {
    expect(factsFor('map.legends').propsType).toBe('')
  })

  it('gives every toolbar surface a props type to intersect with ToolbarToolProps', () => {
    expect(factsFor('map.tools').propsType).toBe('MapToolProps')
    expect(factsFor('bim.tools').propsType).toBe('BimToolProps')
    expect(factsFor('pointcloud.tools').propsType).toBe('PointCloudToolProps')
  })
})
