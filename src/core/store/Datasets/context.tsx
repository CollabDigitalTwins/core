"use client"

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
  return (
    <DatasetsContext.Provider value={{ state, dispatch }}>
      {children}
    </DatasetsContext.Provider>
  )
}

export const useDatasetContext = () => React.useContext(DatasetsContext)