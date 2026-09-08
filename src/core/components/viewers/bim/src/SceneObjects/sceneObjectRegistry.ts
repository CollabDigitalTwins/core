// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { disposeObject3D } from '../lib/disposeObject3D'

import type * as THREE from 'three'

export type SceneObjectKind = 'model' | 'dxf' | 'marker'

export interface SceneObject {
  key: string
  /** null until a file record exists; an unplaced object draws no marker. */
  fileId: string | null
  kind: SceneObjectKind
  root: THREE.Object3D
  dispose: () => void
}

export interface SceneObjectInput {
  key: string
  fileId?: string | null
  kind: SceneObjectKind
  root: THREE.Object3D
  /** Frees whatever the loader allocated beyond the object graph, such as an object URL. */
  dispose?: () => void
}

export function sceneObjectName(key: string): string {
  return `file:${key}`
}

type Listener = (entry: SceneObject) => void

/**
 * Every non-BIM thing the viewer put in the scene, keyed by file id once the record exists, so
 * the sidebar, the viewport menu and the placement editor cannot disagree about what a file is.
 */
export class SceneObjectRegistry {
  private readonly scene: THREE.Object3D
  private readonly entries = new Map<string, SceneObject>()
  private readonly added = new Set<Listener>()
  private readonly removed = new Set<Listener>()

  constructor(deps: { scene: THREE.Object3D }) {
    this.scene = deps.scene
  }

  add(input: SceneObjectInput): SceneObject {
    this.remove(input.key)

    const entry: SceneObject = {
      key: input.key,
      fileId: input.fileId ?? null,
      kind: input.kind,
      root: input.root,
      dispose: input.dispose ?? (() => disposeObject3D(input.root)),
    }
    entry.root.name = sceneObjectName(entry.key)
    this.scene.add(entry.root)
    this.entries.set(entry.key, entry)
    for (const listener of this.added) listener(entry)
    return entry
  }

  get(key: string): SceneObject | undefined {
    return this.entries.get(key)
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }

  list(): SceneObject[] {
    return [...this.entries.values()]
  }

  /** Hands an object placed before its upload finished over to the file record it became. */
  rekey(key: string, fileId: string): SceneObject | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (key !== fileId) this.entries.delete(key)

    entry.key = fileId
    entry.fileId = fileId
    entry.root.name = sceneObjectName(fileId)
    this.entries.set(fileId, entry)
    // Only now is the object addressable by file id, which is what listeners wait for.
    for (const listener of this.added) listener(entry)
    return entry
  }

  setVisible(key: string, visible: boolean): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false
    entry.root.visible = visible
    return true
  }

  remove(key: string): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false

    this.entries.delete(key)
    entry.root.removeFromParent()
    entry.dispose()
    for (const listener of this.removed) listener(entry)
    return true
  }

  clear(): void {
    for (const key of [...this.entries.keys()]) this.remove(key)
  }

  onAdded(listener: Listener): () => void {
    this.added.add(listener)
    return () => { this.added.delete(listener) }
  }

  onRemoved(listener: Listener): () => void {
    this.removed.add(listener)
    return () => { this.removed.delete(listener) }
  }
}
