// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { beginTask, endTask, getSnapshot, setToastRenderer, subscribe, updateTask } from './uploadProgress'

vi.mock('sonner', () => ({
  toast: { custom: vi.fn(), dismiss: vi.fn() },
}))

const { toast } = await import('sonner')

const task = { name: 'scan', fileType: 'point-cloud-file' as const, phase: 'uploading' as const, label: 'Uploading scan', progress: 0 }

describe('uploadProgress', () => {
  beforeEach(() => {
    for (const t of getSnapshot()) endTask(t.id)
    setToastRenderer(() => React.createElement('div'))
    vi.mocked(toast.custom).mockClear()
    vi.mocked(toast.dismiss).mockClear()
  })

  it('holds a task from begin until end', () => {
    const id = beginTask(task)
    expect(getSnapshot().map(t => t.name)).toEqual(['scan'])
    endTask(id)
    expect(getSnapshot()).toEqual([])
  })

  it('notifies subscribers on every change', () => {
    const listener = vi.fn()
    const stop = subscribe(listener)
    const id = beginTask(task)
    updateTask(id, { progress: 50 })
    endTask(id)
    stop()
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('merges a patch without dropping the other fields', () => {
    const id = beginTask(task)
    updateTask(id, { progress: 40 })
    expect(getSnapshot()[0]).toMatchObject({ name: 'scan', phase: 'uploading', progress: 40 })
  })

  it('keeps an indeterminate progress as null', () => {
    const id = beginTask({ ...task, phase: 'uploading', progress: null })
    expect(getSnapshot()[0].progress).toBeNull()
  })

  it('skips the toast when neither phase nor rounded percentage moved', () => {
    const id = beginTask(task)
    const afterBegin = vi.mocked(toast.custom).mock.calls.length
    updateTask(id, { progress: 0 })
    expect(vi.mocked(toast.custom).mock.calls.length).toBe(afterBegin)
    updateTask(id, { progress: 1 })
    expect(vi.mocked(toast.custom).mock.calls.length).toBe(afterBegin + 1)
  })

  it('redraws the toast when only the phase moved', () => {
    const id = beginTask({ ...task, progress: 100 })
    const afterBegin = vi.mocked(toast.custom).mock.calls.length
    updateTask(id, { phase: 'converting', progress: 100 })
    expect(vi.mocked(toast.custom).mock.calls.length).toBe(afterBegin + 1)
  })

  it('dismisses the toast when the task ends', () => {
    const id = beginTask(task)
    endTask(id)
    expect(vi.mocked(toast.dismiss)).toHaveBeenCalledWith(id)
  })

  it('ignores an update for a task that already ended', () => {
    const id = beginTask(task)
    endTask(id)
    expect(() => updateTask(id, { progress: 90 })).not.toThrow()
    expect(getSnapshot()).toEqual([])
  })
})
