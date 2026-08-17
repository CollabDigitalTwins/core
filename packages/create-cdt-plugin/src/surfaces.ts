// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Surface } from './options'

export interface SurfaceFacts {
  /** The kit type entry to import from. Split per surface so a plugin resolves only what it uses. */
  entry: string
  // Where a built-in plugin's component gets the same types from. It cannot import the kit:
  // core's ESLint isolation rule allows `../sdk/*` and the plugin's own files, nothing else.
  coreEntry: string
  /** The viewer props the hosting toolbar passes, intersected with `ToolbarToolProps`. */
  propsType: string
  /** The `activate()` context alias with this surface's registry bound. */
  contextType: string
  /** A type-only devDependency, for the two surfaces whose types name an external package. */
  typeDependency: [string, string] | null
  /** A lucide icon name. A string, never a component: that is why a plugin needs no icon package. */
  icon: string
  /** Entry template basename under each mode's tree. Registration shapes differ per surface. */
  indexTemplate: string
  /** Example body component template basename. */
  example: string
  // Whether Empty.tsx is a valid body here. It interpolates a toolbar props type, so a surface
  // without one would emit invalid TypeScript — the example is the only body it can have.
  allowsEmpty: boolean
  /** Whether the example composes ReadoutRow.tsx. */
  usesReadoutRow: boolean
}

// Data rather than four near-identical template files, so the empty body is one template.
//
// Only map and BIM carry a type dependency, because only their props name an external type,
// and only ever as types: the import guard keeps them out of the bundle.
//
// The `entry` specifiers restate the short name `capabilityConstant` also knows. Deriving it
// would make the two modules import each other, so a test asserts they agree instead.
const FACTS: Record<Surface, SurfaceFacts> = {
  'map.tools': {
    entry: '@collabdt/plugin-kit/types/map',
    coreEntry: '../../sdk/mapViewer',
    propsType: 'MapToolProps',
    contextType: 'MapPluginContext',
    typeDependency: ['maplibre-gl', '^5.24.0'],
    icon: 'MapPin',
    indexTemplate: 'index',
    example: 'ExampleMap',
    allowsEmpty: true,
    usesReadoutRow: true,
  },
  'bim.tools': {
    entry: '@collabdt/plugin-kit/types/bim',
    coreEntry: '../../sdk/bimViewer',
    propsType: 'BimToolProps',
    contextType: 'BimPluginContext',
    typeDependency: ['@thatopen/components', '~3.4.0'],
    icon: 'Boxes',
    indexTemplate: 'index',
    example: 'ExampleBim',
    allowsEmpty: true,
    usesReadoutRow: true,
  },
  'pointcloud.tools': {
    entry: '@collabdt/plugin-kit/types/pointcloud',
    coreEntry: '../../sdk/pointCloudViewer',
    propsType: 'PointCloudToolProps',
    contextType: 'PointCloudPluginContext',
    typeDependency: null,
    icon: 'Cloud',
    indexTemplate: 'index',
    example: 'ExamplePointcloud',
    allowsEmpty: true,
    usesReadoutRow: true,
  },
  'viewer.legends': {
    // A legend registers a hook rather than a component, so it takes no toolbar props.
    entry: '@collabdt/plugin-kit/types/legend',
    // A legend names no viewer type, so its shapes live in the SDK's own types module.
    coreEntry: '../../sdk/types',
    propsType: '',
    contextType: 'LegendPluginContext',
    typeDependency: null,
    icon: 'List',
    indexTemplate: 'indexLegend',
    example: 'ExampleLegend',
    allowsEmpty: false,
    usesReadoutRow: false,
  },
  'map.layers': {
    entry: '@collabdt/plugin-kit/types/map',
    coreEntry: '../../sdk/mapViewer',
    propsType: 'MapToolProps',
    contextType: 'MapPluginContext',
    typeDependency: ['maplibre-gl', '^5.24.0'],
    icon: 'Layers',
    indexTemplate: 'indexLayer',
    example: 'ExampleLayer',
    allowsEmpty: false,
    usesReadoutRow: false,
  },
  // The three below name no viewer library either, so they share one kit entry and take
  // their shapes from the SDK's own types module.
  'data.pages': {
    entry: '@collabdt/plugin-kit/types/ui',
    coreEntry: '../../sdk/types',
    propsType: '',
    contextType: 'UiPluginContext',
    typeDependency: null,
    icon: 'Table',
    indexTemplate: 'indexPage',
    example: 'ExamplePage',
    allowsEmpty: false,
    usesReadoutRow: false,
  },
  'viewer.tabs': {
    entry: '@collabdt/plugin-kit/types/ui',
    coreEntry: '../../sdk/types',
    propsType: '',
    contextType: 'UiPluginContext',
    typeDependency: null,
    icon: 'PanelRight',
    indexTemplate: 'indexTab',
    example: 'ExampleTab',
    allowsEmpty: false,
    usesReadoutRow: false,
  },
  'ui.dialogs': {
    entry: '@collabdt/plugin-kit/types/ui',
    coreEntry: '../../sdk/types',
    propsType: '',
    contextType: 'UiPluginContext',
    typeDependency: null,
    icon: 'SquareStack',
    indexTemplate: 'indexDialog',
    example: 'ExampleDialog',
    allowsEmpty: false,
    usesReadoutRow: false,
  },
}

export function factsFor(surface: Surface): SurfaceFacts {
  return FACTS[surface]
}
