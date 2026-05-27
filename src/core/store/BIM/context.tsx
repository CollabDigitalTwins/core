"use client"

import * as React from "react";
import { BimReducer, BimActions, BimState } from './reducer'

type InitialStateType = {
  bim: BimState
}

const initialState = {
  bim: {
    bimComponents: null,
    world: null,
    fragments: null,
    modelId: null,
    modelIds: [],
    floorplans: [],
    grid: null  ,
    buildingModel: {
      bimFile: null,
      building: null,
    },
    bimModelsAddedToMap: [],
    bimModelName: null,
    editingBimModel: null,
    bcfTopic: null,
    bcfTopics: [],
    bcfTopicId: null,
    modelUIState: {},
  },
}

const reducer = ({ bim }: InitialStateType, action: BimActions) => ({
  bim: BimReducer(bim, action),
})

export const BimContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<BimActions>
}>({
  state: initialState,
  dispatch: () => null,
})

export const BimProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  // Audit Phase 1.A (F-3): memoize value — see AppConfig/context.tsx note.
  const value = React.useMemo(() => ({ state, dispatch }), [state])
  return (
    <BimContext.Provider value={value}>
      {children}
    </BimContext.Provider>
  )
}

export const useBimContext = () => React.useContext(BimContext)