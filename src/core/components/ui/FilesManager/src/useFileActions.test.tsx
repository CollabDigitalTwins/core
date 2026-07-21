// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import * as React from 'react'

const {
  mutateMock,
  downloadFileMock,
  setOpenInfoMock,
  filesDispatchMock,
  menusDispatchMock,
  setViewMock,
} = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  downloadFileMock: vi.fn(),
  setOpenInfoMock: vi.fn(),
  filesDispatchMock: vi.fn(),
  menusDispatchMock: vi.fn(),
  setViewMock: vi.fn(),
}))

vi.mock('swr', () => ({ mutate: (...a: unknown[]) => mutateMock(...a) }))
vi.mock('./downloadUtils', () => ({
  downloadFile: (...a: unknown[]) => downloadFileMock(...a),
}))
vi.mock('../../../../store', () => ({
  useFilesContext: () => ({ dispatch: filesDispatchMock }),
  useMenusContext: () => ({ dispatch: menusDispatchMock, setView: setViewMock }),
}))
vi.mock('../../Sidebar', () => ({
  useSidebar: () => ({ setOpenInfo: setOpenInfoMock }),
}))
vi.mock('../../../../types', () => ({
  ViewerNames: { files: 'files' },
}))

import { useFileActions } from './useFileActions'

const makeFile = (overrides: Partial<any> = {}) => ({
  id: 1,
  name: 'a.csv',
  url: 'http://x',
  isVisible: true,
  ...overrides,
})

function setup(extra: Partial<Parameters<typeof useFileActions>[0]> = {}) {
  const files: any[] = [makeFile()]
  const setFiles = vi.fn((updater: any) => {
    const next = typeof updater === 'function' ? updater(files) : updater
    files.splice(0, files.length, ...next)
  })
  const handleDeleteFile = vi.fn()
  const onView = vi.fn()
  const onDelete = vi.fn()
  const onDownload = vi.fn()
  const onGhost = vi.fn()
  const onInfo = vi.fn()
  const buildingId = 11
  const hook = renderHook(() =>
    useFileActions({
      files: files as any,
      setFiles: setFiles as any,
      buildingId,
      handleDeleteFile,
      onView,
      onDelete,
      onDownload,
      onGhost,
      onInfo,
      ...extra,
    }),
  )
  return { hook, files, setFiles, handleDeleteFile, onView, onDelete, onDownload, onGhost, onInfo }
}

beforeEach(() => {
  mutateMock.mockReset()
  downloadFileMock.mockReset()
  setOpenInfoMock.mockReset()
  filesDispatchMock.mockReset()
  menusDispatchMock.mockReset()
  setViewMock.mockReset()
})

describe('useFileActions', () => {
  it('delete sets deleteTarget; confirm fires handleDeleteFile and mutates SWR', async () => {
    const { hook, handleDeleteFile, setFiles, onDelete } = setup()
    const file = makeFile()

    await act(async () => { await hook.result.current.handleAction('delete', file as any) })
    expect(hook.result.current.deleteDialog.isOpen).toBe(true)
    expect(hook.result.current.deleteDialog.itemName).toBe('a.csv')

    await act(async () => {
      await hook.result.current.deleteDialog.onConfirm({ preventDefault: vi.fn() } as any)
    })

    expect(handleDeleteFile).toHaveBeenCalledWith(file)
    expect(onDelete).toHaveBeenCalledWith(file)
    expect(setFiles).toHaveBeenCalled()
    expect(mutateMock).toHaveBeenCalledWith('/api/files/building/11')
    expect(hook.result.current.deleteDialog.isOpen).toBe(false)
  })

  it('view toggles visibility and calls onView with the new state', async () => {
    const { hook, onView, setFiles } = setup()
    const file = makeFile({ isVisible: false })

    await act(async () => { await hook.result.current.handleAction('view', file as any) })

    expect(onView).toHaveBeenCalledWith(file, true)
    expect(setFiles).toHaveBeenCalled()
  })

  it('download falls back to downloadFile when no custom handler is given', async () => {
    const { hook } = setup({ onDownload: undefined })
    const file = makeFile()
    await act(async () => { await hook.result.current.handleAction('download', file as any) })
    expect(downloadFileMock).toHaveBeenCalledWith(file.url, file)
  })

  it('download prefers the onDownload callback when provided', async () => {
    const { hook, onDownload } = setup()
    const file = makeFile()
    await act(async () => { await hook.result.current.handleAction('download', file as any) })
    expect(onDownload).toHaveBeenCalledWith(file)
    expect(downloadFileMock).not.toHaveBeenCalled()
  })

  it('ghost toggles isGhost via setFiles and calls onGhost with the new state', async () => {
    const { hook, onGhost, setFiles } = setup()
    const file = makeFile({ isGhost: false } as any)
    await act(async () => { await hook.result.current.handleAction('ghost', file as any) })
    expect(onGhost).toHaveBeenCalledWith(file, true)
    expect(setFiles).toHaveBeenCalled()
  })

  it('info dispatches the menu navigation when no onInfo handler is provided', async () => {
    const { hook } = setup({ onInfo: undefined })
    const file = makeFile()
    await act(async () => { await hook.result.current.handleAction('info', file as any) })

    expect(setOpenInfoMock).toHaveBeenCalledWith(false)
    expect(filesDispatchMock).toHaveBeenCalledWith({ type: 'SET_CURRENT_FILE', payload: { currentFile: file } })
    expect(menusDispatchMock).toHaveBeenCalledWith({ type: 'SET_VIEWER', payload: { currentViewer: 'files' } })
    expect(setViewMock).toHaveBeenCalledWith('detail')
  })

  it('info prefers the onInfo callback', async () => {
    const { hook, onInfo } = setup()
    const file = makeFile()
    await act(async () => { await hook.result.current.handleAction('info', file as any) })
    expect(onInfo).toHaveBeenCalledWith(file)
    expect(filesDispatchMock).not.toHaveBeenCalled()
  })
})
