'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { mutate } from 'swr'

import { useUpdateFile } from '../../../../hooks/files/files'

import type { DbFile } from '../../../../types/dbTypes'

/**
 * Persists which files belong to the scene, writing the cache optimistically so the
 * viewer's load effects see the new value in the same tick and roll back on failure.
 */
export function useFileVisibility(buildingId?: number) {
  const updateFileById = useUpdateFile()

  const write = React.useCallback(async (
    ids: Set<number>,
    isVisible: boolean,
    commit: () => Promise<void>,
  ) => {
    if (!buildingId) {
      await commit()
      return
    }

    await mutate(
      ['filesByBuilding', buildingId, ''],
      async () => { await commit() },
      {
        optimisticData: (current?: DbFile[]) =>
          (current ?? []).map(file => (ids.has(file.id) ? { ...file, isVisible } : file)),
        populateCache: false,
        rollbackOnError: true,
        revalidate: true,
      },
    )
  }, [buildingId])

  const setVisible = React.useCallback(async (file: DbFile, isVisible: boolean) => {
    await write(new Set([file.id]), isVisible, async () => {
      await updateFileById(file.id, { isVisible })
    })
  }, [write, updateFileById])

  const setVisibleMany = React.useCallback(async (files: DbFile[], isVisible: boolean) => {
    if (files.length === 0) return

    await write(new Set(files.map(file => file.id)), isVisible, async () => {
      const results = await Promise.allSettled(
        files.map(file => updateFileById(file.id, { isVisible })),
      )
      const failure = results.find(result => result.status === 'rejected')
      if (failure) throw (failure as PromiseRejectedResult).reason
    })
  }, [write, updateFileById])

  return { setVisible, setVisibleMany }
}
