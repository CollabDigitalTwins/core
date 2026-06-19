"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { DatasetReducer, DatasetActions, DatasetState } from './reducer'

type InitialStateType = {
  datasets: DatasetState
}

const initialState = {
  datasets: {
    dataset: null,
    datasets: [],
    datasetId: null,
    addedDatasets: [],
    orgRefreshNonce: 0,
  },
}

const reducer = ({ datasets }: InitialStateType, action: DatasetActions) => ({
  datasets: DatasetReducer(datasets, action),
})

export const DatasetsContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<DatasetActions>
}>({
  state: initialState,
  dispatch: () => null,
})

export const DatasetsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const value = React.useMemo(() => ({ state, dispatch }), [state])
  return (
    <DatasetsContext.Provider value={value}>
      {children}
    </DatasetsContext.Provider>
  )
}

export const useDatasetContext = () => React.useContext(DatasetsContext)
