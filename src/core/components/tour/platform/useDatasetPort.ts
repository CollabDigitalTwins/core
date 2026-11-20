'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { DatasetsContext } from '../../../store'
import { useLatest } from '../useTourLayout'

import type { DatasetPort } from './zoningDemo'

/** The applied datasets as a port the tour demos act through; `applied()` reads the latest state at call time. */
export function useDatasetPort(): DatasetPort {
  const { state, dispatch } = React.useContext(DatasetsContext)
  const applied = useLatest(state.datasets.addedDatasets)
  return React.useMemo(() => ({
    applied: () => applied.current,
    add: dataset => dispatch({ type: 'ADD_DATASET_TO_MAP', payload: { dataset } }),
    update: (datasetName, changes) => dispatch({ type: 'UPDATE_ADDED_DATASET', payload: { datasetName, changes } }),
    remove: datasetId => dispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId } }),
  }), [applied, dispatch])
}
