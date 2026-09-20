"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useFileIntake } from '../../../shared/intake/useFileIntake'
import { usePointCloudIntake } from '../PointClouds/usePointCloudIntake'

import type { IntakeResult } from '../../../shared/intake/useFileIntake'
import type * as THREE from 'three'

export type { IntakeResult } from '../../../shared/intake/useFileIntake'

export interface BimIntakeOptions {
  buildingId: number
  apiBase: string
  existingNames: string[]
  uploadFile: (args: { fileData: unknown, buildingId?: number }) => Promise<unknown>
}

/** The shared intake bound to a BIM scene, where a placement is metres in world space. */
export function useBimFileIntake({ buildingId, apiBase, existingNames, uploadFile }: BimIntakeOptions) {
  const pointClouds = usePointCloudIntake({ apiBase, buildingId, existingNames })

  const intake = useFileIntake({
    buildingId,
    existingNames,
    uploadFile,
    uploadPointCloud: pointClouds.upload,
  })

  const submit = React.useCallback(
    (file: File, at?: THREE.Vector3, scale?: number): Promise<IntakeResult | null> =>
      intake.submit(file, at ? { x: at.x, y: at.y, z: at.z, scale } : { scale }),
    [intake],
  )

  return { submit, needsPlacement: intake.needsPlacement }
}
