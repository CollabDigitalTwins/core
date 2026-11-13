'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { useUpdateFile } from '../../../../../hooks/files/files'

import type { DbFile } from '../../../../../types/dbTypes'

/** Saves a file's building link so the BIM viewer lists it; a file already linked elsewhere keeps its link. */
export function useLinkFileToBuilding() {
  const updateFile = useUpdateFile()
  return React.useCallback(async (file: Pick<DbFile, 'id' | 'attachedFilesBuildingId'>, buildingId: number | null | undefined) => {
    if (buildingId == null || file.attachedFilesBuildingId != null) return
    await updateFile(file.id, { attachedFilesBuildingId: buildingId })
  }, [updateFile])
}
