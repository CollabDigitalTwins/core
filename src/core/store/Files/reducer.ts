// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { FileType } from '../../types/files'

import type { DbFile } from '../../types/dbTypes'
import type { FileAction } from '../../types/global'
import type { ActionMap } from '../ActionMap'

interface FilesTypes {
  files: DbFile[]
  currentFile: DbFile | null
  mapFileIds: number[]
  isMapFileManagerOpen: boolean
  actionMode: FileAction | null
  editingFile: DbFile | null
}

export type FilesState = FilesTypes

export type FilesPayload = {
  // system/map/model file action
  ['SET_FILES']: { files: DbFile[] }
  ['ADD_FILE']: { file: DbFile }
  ['ADD_FILES']: { files: DbFile[] }
  ['REMOVE_FILE']: { id: number }
  ['REMOVE_ALL_FILE']: { id: number }
  ['SET_CURRENT_FILE']: { currentFile: DbFile | null }
  ['SE_CURRENT_FILE']: { currentFile: DbFile | null }

  // map visibility — which files are currently shown on the map
  ['ADD_TO_MAP']: { id: number }
  ['REMOVE_FROM_MAP']: { id: number }
  ['ADD_ALL_TO_MAP']: { ids: number[] }
  ['REMOVE_ALL_FROM_MAP']: void

  // kept for legacy callers outside the map viewer
  ['HIDE_FILE_BY_ID']: { id: number }
  ['UNHIDE_FILE_BY_ID']: { id: number }
  ['TOGGLE_FILE_BY_ID']: { id: number }

  // file manager
  ['HIDE_MAP_FILE_MANAGER']: void
  ['SHOW_MAP_FILE_MANAGER']: void

  // map specific action (legacy)
  ['HIDE_ALL_MAP_FILES']: void
  ['UNHIDE_ALL_MAP_FILES']: void

  // model specific action
  ['HIDE_ALL_MODEL_FILES']: void
  ['UNHIDE_ALL_MODEL_FILES']: void

  ['SET_ACTION_MODE']: { actionMode: FileAction | null }
  ['EDIT_FILE']: { file: DbFile | null }
  ['UPDATE_FILE_COORDS']: { id: number; lat: number; lng: number; elevation?: number; rotation?: number; type?: string }
}

export type FilesActions
  = ActionMap<FilesPayload>[keyof ActionMap<FilesPayload>]

export const FilesReducer = (state: FilesState, action: FilesActions) => {
  switch (action.type) {
    case 'SET_FILES': {
      // Also prune mapFileIds for any file that no longer exists (e.g. deleted via API)
      const incomingIds = new Set(action.payload.files.map(f => f.id))
      return {
        ...state,
        files: action.payload.files,
        mapFileIds: state.mapFileIds.filter(id => incomingIds.has(id)),
      }
    }

    case 'ADD_FILE':
      return { ...state, files: [...state.files, action.payload.file] }

    case 'ADD_FILES':
      return { ...state, files: [...state.files, ...action.payload.files] }

    case 'SET_CURRENT_FILE':
    case 'SE_CURRENT_FILE':
      return { ...state, currentFile: action.payload.currentFile }

    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter(f => f.id !== action.payload.id),
        currentFile: state.currentFile?.id === action.payload.id ? null : state.currentFile,
        mapFileIds: state.mapFileIds.filter(id => id !== action.payload.id),
      }

    // ── Map visibility ────────────────────────────────────────────────────────
    case 'ADD_TO_MAP':
      return {
        ...state,
        mapFileIds: state.mapFileIds.includes(action.payload.id)
          ? state.mapFileIds
          : [...state.mapFileIds, action.payload.id],
      }

    case 'REMOVE_FROM_MAP':
      return {
        ...state,
        mapFileIds: state.mapFileIds.filter(id => id !== action.payload.id),
      }

    case 'ADD_ALL_TO_MAP':
      return {
        ...state,
        mapFileIds: [...new Set([...state.mapFileIds, ...action.payload.ids])],
      }

    case 'REMOVE_ALL_FROM_MAP':
      return { ...state, mapFileIds: [] }

    // ── Legacy visibility (kept for non-map callers) ──────────────────────────
    case 'HIDE_FILE_BY_ID':
      return {
        ...state,
        mapFileIds: state.mapFileIds.filter(id => id !== action.payload.id),
      }

    case 'UNHIDE_FILE_BY_ID':
      return {
        ...state,
        mapFileIds: state.mapFileIds.includes(action.payload.id)
          ? state.mapFileIds
          : [...state.mapFileIds, action.payload.id],
      }

    case 'HIDE_ALL_MAP_FILES':
      return { ...state, mapFileIds: [] }

    case 'UNHIDE_ALL_MAP_FILES':
      return {
        ...state,
        mapFileIds: [...new Set([
          ...state.mapFileIds,
          ...state.files.filter(f => f.type === 'map-file').map(f => f.id),
        ])],
      }

    // ── File manager ──────────────────────────────────────────────────────────
    case 'HIDE_MAP_FILE_MANAGER':
      return { ...state, isMapFileManagerOpen: false }

    case 'SHOW_MAP_FILE_MANAGER':
      return { ...state, isMapFileManagerOpen: true }

    case 'SET_ACTION_MODE':
      return { ...state, actionMode: action.payload.actionMode }

    case 'EDIT_FILE':
      return { ...state, editingFile: action.payload.file }

    case 'UPDATE_FILE_COORDS':
      return {
        ...state,
        files: state.files.map(f =>
          f.id === action.payload.id
            ? {
                ...f,
                lat: action.payload.lat,
                lng: action.payload.lng,
                ...(action.payload.elevation !== undefined && { elevation: action.payload.elevation }),
                ...(action.payload.rotation !== undefined && { rotation: action.payload.rotation }),
                ...(action.payload.type !== undefined && { type: action.payload.type }),
              }
            : f
        ),
      }

    default:
      console.log('THIS FILE ACTION HASN\'T BEEN IMPLEMENTED YET.')
      return state
  }
}
