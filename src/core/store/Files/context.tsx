"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import { FilesReducer } from './reducer'

import type { FilesActions, FilesState } from './reducer';

type InitialStateType = {
  files: FilesState
}

const initialState = {
  files: {
    files: [],
    currentFile: null,
    mapFileIds: [],
    isMapFileManagerOpen: false,
    actionMode: null,
    editingFile: null,
  },
}

const reducer = ({ files }: InitialStateType, action: FilesActions) => ({
  files: FilesReducer(files, action),
})

export const FilesContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<FilesActions>
}>({
  state: initialState,
  dispatch: () => null,
})

export const FilesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const value = React.useMemo(() => ({ state, dispatch }), [state])
  return (
    <FilesContext.Provider value={value}>
      {children}
    </FilesContext.Provider>
  )
}

export const useFilesContext = () => React.useContext(FilesContext)