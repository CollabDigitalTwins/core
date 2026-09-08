'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store/BIM/context'

import { PlacementEditor } from './PlacementEditor'

import type { PlacementState } from './PlacementEditor'

/** Mirrors the live placement session into React. The component owns it; this reads. */
export function usePlacementSession(): PlacementState | null {
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim
  const [session, setSession] = React.useState<PlacementState | null>(null)

  React.useEffect(() => {
    if (!bimComponents) {
      setSession(null)
      return
    }

    const editor = bimComponents.get(PlacementEditor)
    const publish = (next: PlacementState | null) => setSession(next)
    const target = editor.activeTarget
    const current = editor.placement()
    setSession(target && current
      ? { id: target.id, name: target.name, capabilities: target.capabilities, mode: editor.mode, placement: current, pivot: editor.pivot }
      : null)

    editor.onChanged.add(publish)
    return () => editor.onChanged.remove(publish)
  }, [bimComponents])

  return session
}
