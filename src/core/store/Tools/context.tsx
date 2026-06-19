"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

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
  const value = React.useMemo(() => ({ state, dispatch }), [state])
  return (
    <ToolsContext.Provider value={value}>
      {children}
    </ToolsContext.Provider>
  )
}

export const useToolsContext = () => React.useContext(ToolsContext)