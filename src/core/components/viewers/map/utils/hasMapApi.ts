// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as maplibregl from 'maplibre-gl'

const REQUIRED_METHODS = ['getSource', 'getLayer', 'addSource', 'addLayer', 'on', 'off'] as const

/** True once the store's map is a live maplibre instance that sources and layers can be added to. */
export const hasMapApi = (mapInstance: unknown): mapInstance is maplibregl.Map =>
  Boolean(mapInstance)
  && REQUIRED_METHODS.every(method => typeof (mapInstance as maplibregl.Map)[method] === 'function')
