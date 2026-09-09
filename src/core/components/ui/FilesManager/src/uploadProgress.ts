'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { toast } from 'sonner'

import { SECTION_FOR_TYPE } from './fileType'

import type { FileSection, FileType } from './fileType'

export type UploadPhase = 'converting' | 'uploading' | 'finalising'

export interface UploadTask {
  id: string
  name: string
  fileType: FileType
  phase: UploadPhase
  label: string
  progress: number | null
}

type Renderer = (task: UploadTask) => React.ReactElement

let tasks: UploadTask[] = []
let renderer: Renderer | null = null
let nextId = 0

const listeners = new Set<() => void>()

const emit = () => { for (const listener of listeners) listener() }

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): UploadTask[] {
  return tasks
}

/** Installed by UploadProgressBar so the store never has to import JSX. */
export function setToastRenderer(render: Renderer | null): void {
  renderer = render
}

const draw = (task: UploadTask) => {
  if (!renderer) return
  toast.custom(() => renderer!(task), { id: task.id, duration: Number.POSITIVE_INFINITY })
}

const sameFrame = (a: UploadTask, b: UploadTask): boolean =>
  a.phase === b.phase
  && a.label === b.label
  && Math.round(a.progress ?? -1) === Math.round(b.progress ?? -1)

export function beginTask(task: Omit<UploadTask, 'id'>): string {
  const id = `upload-${nextId++}`
  const created = { ...task, id }
  tasks = [...tasks, created]
  draw(created)
  emit()
  return id
}

export function updateTask(id: string, patch: Partial<Pick<UploadTask, 'phase' | 'label' | 'progress'>>): void {
  const current = tasks.find(task => task.id === id)
  if (!current) return

  const next = { ...current, ...patch }
  tasks = tasks.map(task => (task.id === id ? next : task))
  if (!sameFrame(current, next)) draw(next)
  emit()
}

export function endTask(id: string): void {
  if (!tasks.some(task => task.id === id)) return
  tasks = tasks.filter(task => task.id !== id)
  toast.dismiss(id)
  emit()
}

export function useUploadTasks(section?: FileSection): UploadTask[] {
  const all = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return React.useMemo(
    () => (section ? all.filter(task => SECTION_FOR_TYPE[task.fileType] === section) : all),
    [all, section],
  )
}
