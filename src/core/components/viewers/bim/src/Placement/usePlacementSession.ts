"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store/BIM/context'
import { usePlacementState } from '../../../shared/placement/usePlacementState'

import { PlacementEditor } from './PlacementEditor'

import type { PlacementState } from './PlacementEditor'

/** Mirrors the live placement session into React. The component owns it; this reads. */
export function usePlacementSession(): PlacementState | null {
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim
  const editor = React.useMemo(() => bimComponents?.get(PlacementEditor) ?? null, [bimComponents])
  return usePlacementState(editor)
}
