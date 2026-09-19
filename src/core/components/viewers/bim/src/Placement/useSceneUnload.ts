'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store'
import { BIMManager } from '../BIMManager'
import { ModelManager } from '../ModelManager'
import { BimSceneObjects } from '../SceneObjects'
import { SpatialStructure } from '../SpatialStructure'

import type { ViewportTarget } from './resolveViewportTarget'
import type { BimActions } from '../../../../../store/BIM/reducer'
import type { DbFile } from '../../../../../types/dbTypes'
import type * as OBC from '@thatopen/components'

export type SceneKind = ViewportTarget['kind']

export interface SceneUnloadDeps {
  components: OBC.Components | null
  fragments: { core: { models: { list: Map<string, { modelId: string }> }; disposeModel: (id: string) => Promise<unknown> } } | null
  splatIds: string[]
  pointCloudIds: string[]
  dispatch: React.Dispatch<BimActions>
}

// The viewer may be tearing down, and get() throws rather than returning null.
const safeGet = <T,>(components: OBC.Components | null, token: new (...args: never[]) => T): T | null => {
  if (!components) return null
  try { return components.get(token as never) as T }
  catch { return null }
}

export function unloadFromScene(file: DbFile, kind: SceneKind, deps: SceneUnloadDeps): void {
  const id = String(file.id)

  if (kind === 'splat') {
    if (deps.splatIds.includes(id)) deps.dispatch({ type: 'TOGGLE_SPLAT', payload: { splatId: id } })
    return
  }

  if (kind === 'cloud') {
    if (deps.pointCloudIds.includes(id)) deps.dispatch({ type: 'TOGGLE_POINT_CLOUD', payload: { pointCloudId: id } })
    return
  }

  if (kind === 'object') {
    safeGet(deps.components, BimSceneObjects)?.registry?.remove(id)
    return
  }

  safeGet(deps.components, ModelManager)?.remove(id)

  const fragment = deps.fragments?.core.models.list.get(file.name)
  if (!fragment) return

  deps.fragments?.core.disposeModel(fragment.modelId).catch((error: unknown) => {
    console.error(`Failed to dispose fragment model "${file.name}":`, error)
  })
  safeGet(deps.components, BIMManager)?.remove(file.name)
  safeGet(deps.components, SpatialStructure)?.clearForModel(file.name)
}

/** The one scene-unload both the sidebar rows and the viewport context menu delete through. */
export function useSceneUnload(): (file: DbFile, kind: SceneKind) => void {
  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents, fragments, splatIds, pointCloudIds } = state.bim

  return React.useCallback(
    (file: DbFile, kind: SceneKind) => unloadFromScene(file, kind, {
      components: bimComponents ?? null,
      fragments: fragments ?? null,
      splatIds,
      pointCloudIds,
      dispatch,
    }),
    [bimComponents, fragments, splatIds, pointCloudIds, dispatch],
  )
}
