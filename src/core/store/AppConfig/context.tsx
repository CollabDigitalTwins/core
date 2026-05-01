"use client"

import * as React from "react";
import { AppConfigReducer, AppConfigActions, AppConfigState } from './reducer'

type InitialStateType = {
  appConfig: AppConfigState
}

const initialState: InitialStateType = {
  appConfig: {
    organization: null,
    user: null,
  },
}

const reducer = ({ appConfig }: InitialStateType, action: AppConfigActions) => ({
  appConfig: AppConfigReducer(appConfig, action),
})

export const AppConfigContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<AppConfigActions>
}>({
  state: initialState,
  dispatch: () => null,
})

export const AppConfigProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  return (
    <AppConfigContext.Provider value={{ state, dispatch }}>
      {children}
    </AppConfigContext.Provider>
  )
}

export const useAppConfigContext = () => React.useContext(AppConfigContext)