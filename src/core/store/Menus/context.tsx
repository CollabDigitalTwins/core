"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { MenusReducer, MenusActions, MenusState } from './reducer'
import { usePathname } from 'next/navigation'
import type { Building, Site, User, Infrastructure } from '../../types/dbTypes'
import { ViewerNames } from '../../types/dbTypes'
import type { FileRow } from '../../types/files'

type InitialStateType = {
    menus: MenusState
}

// Function to determine if path is an auth page
const isAuthPath = (pathname?: string): boolean => {
    if (!pathname) return false
    return pathname.includes('/auth/')
}

// Get initial state based on current path
const getInitialState = (pathname?: string): InitialStateType => {
    const isAuth = isAuthPath(pathname)
    return {
        menus: {
            currentViewer: isAuth ? ViewerNames.auth : ViewerNames.map,
            rowsPerPage: 10, // Default rows per page
            selectedTab: 'file',
            commentsVisibleInViewer: [],
            currentCommentId: null,
            sensorsVisibleInViewer: [],
            visibleSensorTypes: {},
            visibleSensorTags: {},
            currentSensorId: null,
            currentSensorTypeId: null,
        },
    }
}

const reducer = ({ menus }: InitialStateType, action: MenusActions) => ({
    menus: MenusReducer(menus, action),
})

export const MenusContext = React.createContext<{
    state: InitialStateType
    dispatch: React.Dispatch<MenusActions>
    isSidebarOpen: boolean
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
    view: 'table' | 'detail'
    setView: React.Dispatch<React.SetStateAction<'table' | 'detail'>>
    selectedItem: Building | null
    setSelectedItem: React.Dispatch<React.SetStateAction<Building | null>>
    selectedSite: Site | null
    setSelectedSite: React.Dispatch<React.SetStateAction<Site | null>>
    selectedInfrastructure: Infrastructure | null
    setSelectedInfrastructure: React.Dispatch<React.SetStateAction<Infrastructure | null>>
    selectedFile: FileRow | null
    setSelectedFile: React.Dispatch<React.SetStateAction<FileRow | null>>
    selectedUser: Partial<User> | null
    setSelectedUser: React.Dispatch<React.SetStateAction<Partial<User> | null>>
    isDatasetMenuOpen: boolean
    setIsDatasetMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
    isAuthPage?: boolean
}>({
    state: { menus: { currentViewer: ViewerNames.map, rowsPerPage: 10, selectedTab: 'file', commentsVisibleInViewer: [], currentCommentId: null, sensorsVisibleInViewer: [], visibleSensorTypes: {}, visibleSensorTags: {}, currentSensorId: null, currentSensorTypeId: null } },
    dispatch: () => null,
    isSidebarOpen: false,
    setIsSidebarOpen: () => null,
    view: 'table',
    setView: () => null,
    selectedItem: null,
    setSelectedItem: () => null,
    selectedSite: null,
    setSelectedSite: () => null,
    selectedInfrastructure: null,
    setSelectedInfrastructure: () => null,
    selectedFile: null,
    setSelectedFile: () => null,
    selectedUser: null,
    setSelectedUser: () => null,
    isDatasetMenuOpen: false,
    setIsDatasetMenuOpen: () => null,
    isAuthPage: true,
})

export const MenusProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const pathname = usePathname()
    const [state, dispatch] = React.useReducer(reducer, getInitialState(pathname))

    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
    const [view, setView] = React.useState<'table' | 'detail'>('table')
    const [selectedItem, setSelectedItem] = React.useState<Building | null>(null)
    const [selectedSite, setSelectedSite] = React.useState<Site | null>(null)
    const [selectedInfrastructure, setSelectedInfrastructure] = React.useState<Infrastructure | null>(null)
    const [selectedFile, setSelectedFile] = React.useState<FileRow | null>(null)
    const [selectedUser, setSelectedUser] = React.useState<Partial<User> | null>(null)
    const [isDatasetMenuOpen, setIsDatasetMenuOpen] = React.useState(false)
    // Check if current path is an authentication page
    const isAuthPage = isAuthPath(pathname)

    // Update state if pathname changes and auth state changes
    React.useEffect(() => {
        if (isAuthPage && state.menus.currentViewer !== ViewerNames.auth) {
            dispatch({
                type: 'SET_VIEWER',
                payload: { currentViewer: ViewerNames.auth },
            })
            setIsSidebarOpen(false)
        }
        else if (!isAuthPage && state.menus.currentViewer === ViewerNames.auth) {
            dispatch({
                type: 'SET_VIEWER',
                payload: { currentViewer: ViewerNames.map },
            })
        }
    }, [pathname, isAuthPage, state.menus.currentViewer])

    const value = React.useMemo(() => ({
        state,
        dispatch,
        isSidebarOpen,
        setIsSidebarOpen,
        view,
        setView,
        selectedItem,
        setSelectedItem,
        selectedSite,
        setSelectedSite,
        selectedInfrastructure,
        setSelectedInfrastructure,
        selectedFile,
        setSelectedFile,
        selectedUser,
        setSelectedUser,
        isDatasetMenuOpen,
        setIsDatasetMenuOpen,
    }), [
        state, isSidebarOpen, view, selectedItem, selectedSite,
        selectedInfrastructure, selectedFile, selectedUser, isDatasetMenuOpen,
    ])

    return (
        <MenusContext.Provider value={value}>
    { children }
    </MenusContext.Provider>
  )
}

export const useMenusContext = () => React.useContext(MenusContext)
