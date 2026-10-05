'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { DatasetsContext } from '../../store/Datasets/context'
import { pluginDatasetId } from '../host/pluginDatasetId'
import { PluginDatasetLookupContext } from '../host/pluginDatasetLookup'
import { usePluginId } from '../host/scope'

export interface PluginDatasetState {
  /** The user added it from the Datasets menu. */
  applied: boolean
  /** Applied and not hidden with its eye toggle: draw it only when this is true. */
  visible: boolean
  /** What ticking it in the Datasets menu does: adds it to the map, or shows it again if hidden. */
  apply: () => void
  /** What unticking it in the Datasets menu does: takes it off the map. */
  remove: () => void
}

/**
 * Whether one of this plugin's `map.datasets` is on the map, with the Datasets menu's own
 * actions for it so a plugin's controls and the menu never disagree. `id` is the registration's.
 */
export function usePluginDataset(id: string): PluginDatasetState {
  const pluginId = usePluginId()
  const { state, dispatch } = React.useContext(DatasetsContext)
  const findDataset = React.useContext(PluginDatasetLookupContext)
  const datasetId = pluginDatasetId(pluginId, id)
  const added = state.datasets.addedDatasets.find(dataset => dataset.id === datasetId)
  const applied = added !== undefined
  const visible = applied && added.visible !== false

  const apply = React.useCallback(() => {
    if (applied) {
      if (!visible) dispatch({ type: 'TOGGLE_DATASET_VISIBILITY', payload: { datasetId } })
      return
    }
    const dataset = findDataset(pluginId, id)
    if (dataset) dispatch({ type: 'ADD_DATASET_TO_MAP', payload: { dataset } })
  }, [applied, visible, findDataset, pluginId, id, datasetId, dispatch])

  const remove = React.useCallback(() => {
    if (applied) dispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId } })
  }, [applied, datasetId, dispatch])

  return React.useMemo(() => ({ applied, visible, apply, remove }), [applied, visible, apply, remove])
}
