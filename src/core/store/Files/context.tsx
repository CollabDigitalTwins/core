"use client"

import * as React from "react";
import { FilesReducer, FilesActions, FilesState } from './reducer'

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
  return (
    <FilesContext.Provider value={{ state, dispatch }}>
      {children}
    </FilesContext.Provider>
  )
}

export const useFilesContext = () => React.useContext(FilesContext)