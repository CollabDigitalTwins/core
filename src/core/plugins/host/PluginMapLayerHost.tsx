'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useMapViewer } from '../sdk/mapViewer'

import { usePluginConfigs, usePluginContributions } from './provider'
import { PluginScopeProvider } from './scope'

/**
 * Mounts every `map.layers` contribution for as long as the map exists.
 *
 * Rendered by `MapViewer`, not by a toolbar: a tool's panel is a dropdown that unmounts
 * when it closes, so a layer owned there would disappear with it — and anything else the
 * plugin does, from a sidebar tab or a data page, would draw onto a map with no layer.
 *
 * The contributions render nothing themselves. They receive the map, manage their own
 * sources and layers through effects, and clean up on unmount.
 */
export function PluginMapLayerHost() {
  const registrations = usePluginContributions('map.layers')
  const configs = usePluginConfigs()
  const { map } = useMapViewer()

  return (
    <>
      {registrations.map((registration) => {
        const Layer = registration.component

        return (
          <PluginScopeProvider
            key={`${registration.pluginId}:${registration.id}`}
            pluginId={registration.pluginId}
            config={configs[registration.pluginId]}
          >
            <Layer map={map} />
          </PluginScopeProvider>
        )
      })}
    </>
  )
}
