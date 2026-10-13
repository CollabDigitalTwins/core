// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as maplibregl from 'maplibre-gl'

/** True once the store's map is a live maplibre instance that sources and layers can be added to. */
export const hasMapApi = (mapInstance: unknown): mapInstance is maplibregl.Map => (
  Boolean(mapInstance)
  && typeof (mapInstance as maplibregl.Map).getSource === 'function'
  && typeof (mapInstance as maplibregl.Map).getLayer === 'function'
  && typeof (mapInstance as maplibregl.Map).addSource === 'function'
  && typeof (mapInstance as maplibregl.Map).addLayer === 'function'
  && typeof (mapInstance as maplibregl.Map).on === 'function'
  && typeof (mapInstance as maplibregl.Map).off === 'function'
)
