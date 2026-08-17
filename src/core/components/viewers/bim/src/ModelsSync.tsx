'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as React from 'react'

import { BimContext } from '../../../../store/BIM/context'

/**
 * Mirrors the loaded models into `BimState.modelIds`.
 *
 * `modelIds` existed on the store from the start but nothing ever wrote to it, so
 * it was permanently `[]` — anything deriving from it concluded no model was
 * loaded even with one on screen. `FragmentsManager.list` is the truth; this
 * publishes it.
 *
 * One central subscription, the same shape as `SelectionSync` and
 * `ShadowEnroller`, so every load path is covered rather than each caller wiring
 * its own listener. `IfcClasses` already subscribes to the
 * same two events to rebuild its class tree.
 *
 * Renders nothing. Mount it once inside the BIM viewer.
 */
export function ModelsSync() {
  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents } = state.bim

  React.useEffect(() => {
    if (!bimComponents) return

    let fragments: OBC.FragmentsManager
    try {
      fragments = bimComponents.get(OBC.FragmentsManager)
    } catch {
      return
    }

    // Held from setup rather than read again on teardown. `FragmentsManager.list` is a
    // getter that throws "not initialized" once the manager is disposed, and leaving the
    // viewer disposes it before this cleanup runs — so unsubscribing through the getter
    // crashed on the way out. The list object itself stays valid, and removing a listener
    // from it is harmless whether or not the manager is still alive.
    const list = fragments.list

    const publish = () => {
      dispatch({
        type: 'SET_MODEL_IDS',
        payload: { modelIds: [...list.keys()] },
      })
    }

    // Publish once on mount: a model may already be loaded by the time this
    // subscribes, which is the common case when switching back to the viewer.
    publish()

    list.onItemSet.add(publish)
    list.onItemDeleted.add(publish)

    return () => {
      list.onItemSet.remove(publish)
      list.onItemDeleted.remove(publish)
    }
  }, [bimComponents, dispatch])

  return null
}
