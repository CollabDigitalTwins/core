// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { capabilitiesForFile } from './placementCapabilities'

import type { PlacementCapabilities } from './placementTarget'
import type { DbFile } from '../../../../../types/dbTypes'

export interface FragmentHit {
  distance: number
  modelId?: string
}

export interface CloudHit {
  distance: number
  id: string
}

export interface ObjectHit {
  distance: number
  /** The scene registry key, which is the file id for anything that finished uploading. */
  fileId: string
}

export interface ViewportTarget {
  file: DbFile
  kind: 'model' | 'cloud' | 'object'
  capabilities: PlacementCapabilities
}

export interface ResolveViewportTargetInput {
  files: DbFile[]
  fragment: FragmentHit | null
  cloud: CloudHit | null
  object: ObjectHit | null
}

/** What sits under the cursor, or null when nothing placeable does. */
export function resolveViewportTarget(
  { files, fragment, cloud, object }: ResolveViewportTargetInput,
): ViewportTarget | null {
  const byName = (name?: string) => files.find((candidate) => candidate.name === name)
  const byId = (id: string) => files.find((candidate) => String(candidate.id) === id)

  const candidates = [
    // Ties go to the fragment, which draws a snap marker the user is already aiming at.
    fragment && { distance: fragment.distance, kind: 'model' as const, file: byName(fragment.modelId) },
    object && { distance: object.distance, kind: 'object' as const, file: byId(object.fileId) },
    cloud && { distance: cloud.distance, kind: 'cloud' as const, file: byId(cloud.id) },
  ].filter((candidate): candidate is { distance: number; kind: ViewportTarget['kind']; file: DbFile | undefined } => Boolean(candidate))

  let nearest: { kind: ViewportTarget['kind']; file: DbFile } | null = null
  let nearestDistance = Infinity
  for (const candidate of candidates) {
    if (!candidate.file || candidate.distance >= nearestDistance) continue
    nearest = { kind: candidate.kind, file: candidate.file }
    nearestDistance = candidate.distance
  }

  if (!nearest) return null
  return { ...nearest, capabilities: capabilitiesForFile(nearest.file) }
}
