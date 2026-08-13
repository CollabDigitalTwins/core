// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Surface } from './options'

export interface SurfaceFacts {
  /** The kit type entry to import from. Split per surface so a plugin resolves only what it uses. */
  entry: string
  /** The viewer props the hosting toolbar passes, intersected with `ToolbarToolProps`. */
  propsType: string
  /** The `activate()` context alias with this surface's registry bound. */
  contextType: string
  /** A type-only devDependency, for the two surfaces whose types name an external package. */
  typeDependency: [string, string] | null
  /** A lucide icon name. A string, never a component: that is why a plugin needs no icon package. */
  icon: string
}

/**
 * What differs between the four capability surfaces.
 *
 * Data rather than four near-identical template files, so the empty body is one template
 * and the differences are reviewable in one place.
 *
 * Only `map.tools` and `bim.tools` carry a type dependency. Their props name `maplibre-gl`
 * and `@thatopen/components` types respectively, so the plugin needs those installed to
 * typecheck. Type-only: the import guard is what keeps them out of the bundle.
 * `pointcloud.tools` takes `viewer: unknown` because Potree ships no types, and
 * `map.legends` names nothing external at all.
 *
 * The `entry` specifiers restate the surface short name that `capabilityConstant` in
 * `render.ts` also knows. Stated twice on purpose: deriving it would make these two modules
 * import each other, and a test asserts they agree.
 */
const FACTS: Record<Surface, SurfaceFacts> = {
  'map.tools': {
    entry: '@collabdt/plugin-kit/types/map',
    propsType: 'MapToolProps',
    contextType: 'MapPluginContext',
    typeDependency: ['maplibre-gl', '^5.24.0'],
    icon: 'MapPin',
  },
  'bim.tools': {
    entry: '@collabdt/plugin-kit/types/bim',
    propsType: 'BimToolProps',
    contextType: 'BimPluginContext',
    typeDependency: ['@thatopen/components', '~3.4.0'],
    icon: 'Boxes',
  },
  'pointcloud.tools': {
    entry: '@collabdt/plugin-kit/types/pointcloud',
    propsType: 'PointCloudToolProps',
    contextType: 'PointCloudPluginContext',
    typeDependency: null,
    icon: 'Cloud',
  },
  'map.legends': {
    // A legend registers a hook rather than a component, so it takes no toolbar props.
    entry: '@collabdt/plugin-kit/types/legend',
    propsType: '',
    contextType: 'LegendPluginContext',
    typeDependency: null,
    icon: 'List',
  },
}

export function factsFor(surface: Surface): SurfaceFacts {
  return FACTS[surface]
}
