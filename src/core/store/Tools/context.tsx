"use client"

import * as React from "react";
import { ToolsReducer, ToolsActions, ToolsState } from './reducer'

type InitialStateType = {
  tools: ToolsState
}

const initialState = {
  tools: {
    currentToolId: null,
  },
}

const reducer = ({ tools }: InitialStateType, action: ToolsActions) => ({
  tools: ToolsReducer(tools, action),
})

export const ToolsContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<ToolsActions>
}>({
  state: initialState,
  dispatch: () => null,
})

export const ToolsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  return (
    <ToolsContext.Provider value={{ state, dispatch }}>
      {children}
    </ToolsContext.Provider>
  )
}

export const useToolsContext = () => React.useContext(ToolsContext)