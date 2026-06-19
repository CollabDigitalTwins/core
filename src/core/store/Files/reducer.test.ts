// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'
import { FilesReducer, type FilesState } from './reducer'
import type { DbFile } from '../../types/dbTypes'

const file = (id: number, extra: Partial<DbFile> = {}) => ({ id, ...extra }) as unknown as DbFile
const base: FilesState = {
  files: [],
  currentFile: null,
  mapFileIds: [],
  isMapFileManagerOpen: false,
  actionMode: null,
  editingFile: null,
}

describe('FilesReducer', () => {
  it('SET_FILES replaces files and prunes mapFileIds to still-existing files', () => {
    const state: FilesState = { ...base, mapFileIds: [1, 2, 3] }
    const next = FilesReducer(state, { type: 'SET_FILES', payload: { files: [file(1), file(3)] } } as never)
    expect(next.files.map((f) => f.id)).toEqual([1, 3])
    expect(next.mapFileIds).toEqual([1, 3]) // 2 pruned — no longer exists
  })

  it('ADD_FILE / ADD_FILES append to the list', () => {
    const one = FilesReducer(base, { type: 'ADD_FILE', payload: { file: file(1) } } as never)
    expect(one.files.map((f) => f.id)).toEqual([1])
    const more = FilesReducer(one, { type: 'ADD_FILES', payload: { files: [file(2), file(3)] } } as never)
    expect(more.files.map((f) => f.id)).toEqual([1, 2, 3])
  })

  it('REMOVE_FILE drops the file, removes it from the map, and clears currentFile if it was selected', () => {
    const state: FilesState = { ...base, files: [file(1), file(2)], mapFileIds: [1, 2], currentFile: file(2) }
    const next = FilesReducer(state, { type: 'REMOVE_FILE', payload: { id: 2 } } as never)
    expect(next.files.map((f) => f.id)).toEqual([1])
    expect(next.mapFileIds).toEqual([1])
    expect(next.currentFile).toBeNull()
  })

  it('map visibility: ADD_TO_MAP dedups, ADD_ALL_TO_MAP dedups, REMOVE_FROM_MAP, REMOVE_ALL_FROM_MAP', () => {
    let s = FilesReducer({ ...base, mapFileIds: [1] }, { type: 'ADD_TO_MAP', payload: { id: 1 } } as never)
    expect(s.mapFileIds).toEqual([1]) // already present → no duplicate
    s = FilesReducer(s, { type: 'ADD_TO_MAP', payload: { id: 2 } } as never)
    expect(s.mapFileIds).toEqual([1, 2])
    s = FilesReducer(s, { type: 'ADD_ALL_TO_MAP', payload: { ids: [2, 3, 4] } } as never)
    expect([...s.mapFileIds].sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
    s = FilesReducer(s, { type: 'REMOVE_FROM_MAP', payload: { id: 3 } } as never)
    expect(s.mapFileIds).not.toContain(3)
    s = FilesReducer(s, { type: 'REMOVE_ALL_FROM_MAP' } as never)
    expect(s.mapFileIds).toEqual([])
  })

  it('SET_CURRENT_FILE and the typo-aliased SE_CURRENT_FILE both set currentFile', () => {
    expect(FilesReducer(base, { type: 'SET_CURRENT_FILE', payload: { currentFile: file(7) } } as never).currentFile?.id).toBe(7)
    expect(FilesReducer(base, { type: 'SE_CURRENT_FILE', payload: { currentFile: file(8) } } as never).currentFile?.id).toBe(8)
  })

  it('UPDATE_FILE_COORDS sets lat/lng and only the optional fields that were provided', () => {
    const state: FilesState = { ...base, files: [file(1, { lat: 0, lng: 0 })] }
    const next = FilesReducer(state, { type: 'UPDATE_FILE_COORDS', payload: { id: 1, lat: 45, lng: -75 } } as never)
    expect(next.files[0].lat).toBe(45)
    expect(next.files[0].lng).toBe(-75)
    expect(next.files[0].elevation).toBeUndefined()
  })

  it('file-manager + edit toggles', () => {
    expect(FilesReducer(base, { type: 'SHOW_MAP_FILE_MANAGER' } as never).isMapFileManagerOpen).toBe(true)
    expect(FilesReducer({ ...base, isMapFileManagerOpen: true }, { type: 'HIDE_MAP_FILE_MANAGER' } as never).isMapFileManagerOpen).toBe(false)
    expect(FilesReducer(base, { type: 'EDIT_FILE', payload: { file: file(3) } } as never).editingFile?.id).toBe(3)
  })
})
