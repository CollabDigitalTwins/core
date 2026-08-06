'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../store/BIM/context'

import { getSelectedItems, onSelectionChanged } from './lib/bimItemActions'

/**
 * Mirrors the Highlighter's selection into `BimState.selection`.
 *
 * The Highlighter stays the single source of truth — this only publishes it so
 * React can read it. One central subscription rather than one per consumer, for
 * the same reason shadow enrolment is centralised in `ShadowEnroller`
 * (ADR-005): every path that changes the selection is then covered, including a
 * viewport click, a sidebar tree action, and a plugin calling `select()`.
 *
 * Renders nothing. Mount it once inside the BIM viewer, after the components are
 * set on the store — it re-subscribes when `bimComponents` changes, which is what
 * picks up the Highlighter once the viewer has built it.
 */
export function SelectionSync() {
  const { state, dispatch } = React.useContext(BimContext)
  const { bimComponents } = state.bim

  React.useEffect(() => {
    if (!bimComponents) return

    const publish = () => {
      dispatch({
        type: 'SET_BIM_SELECTION',
        payload: { selection: getSelectedItems(bimComponents) },
      })
    }

    // Publish once on mount: the selection may already be non-empty when this
    // subscribes (a restored view, or a model loaded with something selected).
    publish()

    return onSelectionChanged(bimComponents, publish)
  }, [bimComponents, dispatch])

  return null
}
