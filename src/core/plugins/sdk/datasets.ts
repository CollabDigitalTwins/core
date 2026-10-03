'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { DatasetsContext } from '../../store/Datasets/context'
import { pluginDatasetId } from '../host/pluginDatasetId'
import { usePluginId } from '../host/scope'

export interface PluginDatasetState {
  /** The user added it from the Datasets menu. */
  applied: boolean
  /** Applied and not hidden with its eye toggle: draw it only when this is true. */
  visible: boolean
}

/**
 * Whether one of this plugin's `map.datasets` is on the map, so the `map.layers` and
 * `viewer.legends` that draw it know when to. `id` is the registration's own id.
 */
export function usePluginDataset(id: string): PluginDatasetState {
  const pluginId = usePluginId()
  const { state } = React.useContext(DatasetsContext)
  const datasetId = pluginDatasetId(pluginId, id)
  const added = state.datasets.addedDatasets.find(dataset => dataset.id === datasetId)
  const applied = added !== undefined
  const visible = applied && added.visible !== false

  return React.useMemo(() => ({ applied, visible }), [applied, visible])
}
