'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useMapViewer } from '../sdk/mapViewer'

import { usePluginConfigs, usePluginContributions } from './provider'
import { PluginScopeProvider } from './scope'

/**
 * Mounts every `map.layers` contribution for as long as the map exists — a toolbar panel
 * unmounts when its dropdown closes and would take its layers with it.
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
