"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import {
  MapSitesReducer,
  MapSitesActions,
  MapSitesState,
  initialMapSitesState,
} from './reducer'

type InitialStateType = {
  mapSites: MapSitesState
}

const initialState: InitialStateType = {
  mapSites: initialMapSitesState,
}

const reducer = ({ mapSites }: InitialStateType, action: MapSitesActions) => ({
  mapSites: MapSitesReducer(mapSites, action),
})

export const MapSitesContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<MapSitesActions>
}>({
  state: initialState,
  dispatch: () => null,
})

export const MapSitesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const value = React.useMemo(() => ({ state, dispatch }), [state])
  return (
    <MapSitesContext.Provider value={value}>
      {children}
    </MapSitesContext.Provider>
  )
}

export const useMapSitesContext = () => React.useContext(MapSitesContext)
