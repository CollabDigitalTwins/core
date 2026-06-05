"use client"

import * as React from 'react'

import type { Building, Site } from '../../types/dbTypes'

import type { BuildingsActions, BuildingsState } from './reducer'

import { BuildingsReducer } from './reducer'

export type CompareItem = { 
  id: string 
} & Omit<Partial<Building>, 'id'> & Omit<Partial<Site>, 'id'>

type InitialStateType = {
  buildings: BuildingsState
}

const initialState = {
  buildings: {
    buildings: [],
    building: null,
  },
}

function reducer({ buildings }: InitialStateType, action: BuildingsActions) {
  return {
    buildings: BuildingsReducer(buildings, action),
  }
}

export const BuildingsContext = React.createContext<{
  state: InitialStateType
  dispatch: React.Dispatch<BuildingsActions>
  compareItems: CompareItem[]
  setCompareItems?: React.Dispatch<React.SetStateAction<CompareItem[]>>
  addItemToCompare?: (item: CompareItem) => void
  removeItemFromCompare?: (itemId: string) => void
  comparing: boolean
  setComparing?: React.Dispatch<React.SetStateAction<boolean>>
}>({
      state: initialState,
      dispatch: () => null,
      compareItems: [],
      setCompareItems: () => null,
      addItemToCompare: () => null,
      removeItemFromCompare: () => null,
      comparing: false,
      setComparing: () => null,
    })

export const BuildingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState)
  const [compareItems, setCompareItems] = React.useState<CompareItem[]>([])
  const [comparing, setComparing] = React.useState<boolean>(false)

  const addItemToCompare = React.useCallback((item: CompareItem) => {
    setCompareItems((current) => {
      if (current.some(i => i.id === item.id)) {
        return current
      }
      if (current.length >= 3) {
        return [...current.slice(1), item]
      }
      return [...current, item]
    })
  }, [])

  const removeItemFromCompare = React.useCallback((itemId: string) => {
    setCompareItems(current =>
      current.filter(i => i.id !== itemId),
    )
  }, [])

  const value = React.useMemo(() => ({
    state,
    dispatch,
    compareItems,
    setCompareItems,
    comparing,
    setComparing,
    addItemToCompare,
    removeItemFromCompare,
  }), [state, compareItems, comparing, addItemToCompare, removeItemFromCompare])

  return (
    <BuildingsContext.Provider value={value}>
      {children}
    </BuildingsContext.Provider>
  )
}

export const useBuildingsContext = () => React.useContext(BuildingsContext)