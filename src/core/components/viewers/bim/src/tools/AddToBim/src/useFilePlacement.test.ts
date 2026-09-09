// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../Cursor', () => ({ Cursor: class {} }))
vi.mock('../../../Highlighter', () => ({ Highlighter: class {} }))
vi.mock('../../../ModelManager', () => ({ ModelManager: class {} }))
vi.mock('../../../SceneObjects', () => ({ BimSceneObjects: class {} }))
vi.mock('./AddDxf', () => ({ AddDxf: class {} }))

import { useFilePlacement } from './useFilePlacement'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), dismiss: vi.fn(), custom: vi.fn() } }))

const submit = vi.fn(async () => ({ id: 11 }))
const needsPlacement = vi.fn((file: File) => /\.(glb|gltf|dxf)$/i.test(file.name))
const intake = { submit, needsPlacement }

const change = (name: string) =>
  ({ target: { files: [new File([''], name)], value: '' } }) as unknown as React.ChangeEvent<HTMLInputElement>

describe('useFilePlacement', () => {
  it('submits a laz straight away and never asks for a placement click', async () => {
    submit.mockClear()
    const { result } = renderHook(() =>
      useFilePlacement(null, null, null, vi.fn(), 7, intake, vi.fn()))

    await act(async () => { result.current.handleFileSelect(change('scan.laz'), 'bim-add-file') })

    expect(submit).toHaveBeenCalledOnce()
    expect(result.current.isPlacingFile).toBe(false)
  })

  it('submits an e57 straight away too', async () => {
    submit.mockClear()
    const { result } = renderHook(() =>
      useFilePlacement(null, null, null, vi.fn(), 7, intake, vi.fn()))

    await act(async () => { result.current.handleFileSelect(change('scan.e57'), 'bim-add-file') })

    expect(submit).toHaveBeenCalledOnce()
    expect(result.current.isPlacingFile).toBe(false)
  })

  it('waits for a placement click before submitting a glb', async () => {
    submit.mockClear()
    const { result } = renderHook(() =>
      useFilePlacement(null, null, null, vi.fn(), 7, intake, vi.fn()))

    await act(async () => { result.current.handleFileSelect(change('model.glb'), 'bim-add-file') })

    expect(submit).not.toHaveBeenCalled()
    expect(result.current.isPlacingFile).toBe(true)
  })

  it('submits an ifc at the origin without a placement click', async () => {
    submit.mockClear()
    const { result } = renderHook(() =>
      useFilePlacement(null, null, null, vi.fn(), 7, intake, vi.fn()))

    await act(async () => { result.current.handleFileSelect(change('tower.ifc'), 'bim-add-file') })

    expect(submit).toHaveBeenCalledOnce()
    expect(result.current.isPlacingFile).toBe(false)
  })
})
