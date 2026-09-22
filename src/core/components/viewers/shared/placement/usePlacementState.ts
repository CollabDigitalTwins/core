"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import type { PlacementState } from './placementCore'
import type { PlacementCapabilities, PlacementMode, PlacementTarget } from './placementTarget'
import type { PointCloudPlacement } from '../pointcloud/pointCloudPlacement'
import type * as THREE from 'three'

type ChangedListener = (state: PlacementState | null) => void

/** The slice of a placement session React reads. Both the core and its adapters satisfy it. */
export interface PlacementStateSource {
  readonly activeTarget: PlacementTarget | null
  readonly mode: PlacementMode
  readonly pivot: THREE.Vector3 | null
  readonly capabilities: PlacementCapabilities | null
  placement(): PointCloudPlacement | null
  onChanged: { add(listener: ChangedListener): void, remove(listener: ChangedListener): void }
}

/** Mirrors the live placement session into React. The component owns it; this reads. */
export function usePlacementState(source: PlacementStateSource | null): PlacementState | null {
  const [session, setSession] = React.useState<PlacementState | null>(null)

  React.useEffect(() => {
    if (!source) {
      setSession(null)
      return
    }

    const publish = (next: PlacementState | null) => setSession(next)
    const target = source.activeTarget
    const current = source.placement()
    setSession(target && current
      ? { id: target.id, name: target.name, capabilities: target.capabilities, mode: source.mode, placement: current, pivot: source.pivot }
      : null)

    source.onChanged.add(publish)
    return () => source.onChanged.remove(publish)
  }, [source])

  return session
}
