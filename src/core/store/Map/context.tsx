"use client"

import * as React from "react";
import { MapReducer, MapActions, MapState } from './reducer'
import { DEFAULT_MAP_STYLE } from '../../components/viewers/map/utils/mapStyleCatalog';

type InitialStateType = {
  map: MapState
}

const initialState: InitialStateType = {
  map: {
    mapStyle: DEFAULT_MAP_STYLE,
    map: null,
    cursor: '',
    currentLocation: null,
    countrySubdivisionsData: null,
    markerLocation: null,
    currentMapCameraPosition: null,
    currentUrl: '/',
    currentSearchParams: {},
    currentStringParams: '',
    geojson: null,
    addedLayers: [],
    modelId: null,
    bimModelsAddedToMap: [],
    bimModelLoadingLocation: [],
    clickedFeature: null,
    mapClickManager: null,
    mapHoverManager: null,
    dimensionsColour: '#ffffff',
    terrainLevel: 'medium',
  },
}

const reducer = ({ map }: InitialStateType, action: MapActions) => ({
  map: MapReducer(map, action),
})

export const MapContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<MapActions>
}>({
  state: initialState,
  dispatch: () => null,
})

export const MapProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const value = React.useMemo(() => ({ state, dispatch }), [state])
  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  )
}

export const useMapContext = () => React.useContext(MapContext)