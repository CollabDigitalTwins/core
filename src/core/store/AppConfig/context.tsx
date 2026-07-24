"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import { detectTimeZone } from '../../utils/timeUtils'

import { AppConfigReducer } from './reducer'

import type { AppConfigActions, AppConfigState } from './reducer';

export type RuntimeConfig = {
  minioUrl?: string
  martinUrl?: string
  recaptchaSiteKey?: string
  pointcloudApiUrl?: string
  geocodeEarthApiKey?: string
  geocoderUrl?: string
  photonUrl?: string
  nominatimUrl?: string
  maptilerKey?: string
}

type InitialStateType = {
  appConfig: AppConfigState
  runtimeConfig: RuntimeConfig
}

const initialState: InitialStateType = {
  appConfig: {
    organization: null,
    user: null,
    displayTimeZone: detectTimeZone(),
    displayTimeZoneUserSet: false,
  },
  runtimeConfig: {},
}

const reducer = (
  { appConfig, runtimeConfig }: InitialStateType,
  action: AppConfigActions,
): InitialStateType => ({
  appConfig: AppConfigReducer(appConfig, action),
  runtimeConfig,
})

export const AppConfigContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<AppConfigActions>
}>({
  state: initialState,
  dispatch: () => null,
})

export const AppConfigProvider: React.FC<React.PropsWithChildren<{ runtimeConfig?: RuntimeConfig }>> = ({ children, runtimeConfig = {} }) => {
  const [state, dispatch] = React.useReducer(reducer, { ...initialState, runtimeConfig })
  const value = React.useMemo(() => ({ state, dispatch }), [state])
  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  )
}

export const useAppConfigContext = () => React.useContext(AppConfigContext)