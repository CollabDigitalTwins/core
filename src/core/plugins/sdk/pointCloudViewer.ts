'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { PointCloudContext } from '../../store/PointCloud/context'

/**
 * The point-cloud viewer, as a plugin sees it.
 *
 * Potree ships no type declarations, so `viewer` is deliberately `unknown`: a
 * plugin narrows it itself rather than core inventing a type that could drift from
 * the library.
 */

export interface PointCloudToolProps {
  viewer: unknown
  /** False until Potree has finished initialising. */
  ready: boolean
}

export function usePointCloudViewer(): PointCloudToolProps {
  const { state } = React.useContext(PointCloudContext)
  const { viewer, ready } = state.pointcloud

  return React.useMemo(
    () => ({ viewer: viewer ?? null, ready: Boolean(ready) }),
    [viewer, ready],
  )
}
