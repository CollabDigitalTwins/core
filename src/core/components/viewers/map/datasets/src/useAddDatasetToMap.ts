'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { DatasetsContext } from '../../../../../store/Datasets/context'

import { datasetNoticeId, describeLoadError } from './loadErrors'
import { markDatasetUnavailable } from './unavailableDatasets'

import type { Dataset } from '../../../../../types/datasetTypes'

function withName(names: ReadonlySet<string>, name: string, present: boolean): ReadonlySet<string> {
  const next = new Set(names)
  if (present) next.add(name)
  else next.delete(name)
  return next
}

/** Adds a dataset to the map only after its `probe` passes; `checking` holds the names still being checked. */
export function useAddDatasetToMap(): { addDataset: (dataset: Dataset) => Promise<boolean>; checking: ReadonlySet<string> } {
  const { dispatch } = React.useContext(DatasetsContext)
  const t = useTranslations('DatasetLoadStatus')
  const [checking, setChecking] = React.useState<ReadonlySet<string>>(() => new Set())

  const addDataset = React.useCallback(async (dataset: Dataset) => {
    setChecking(names => withName(names, dataset.name, true))
    try {
      await dataset.probe?.()
    }
    catch (error) {
      const { reason, permanent } = describeLoadError(error)
      markDatasetUnavailable(dataset, permanent ? 'denied' : 'failed')
      toast.error(dataset.name, { id: datasetNoticeId(dataset.name), description: t(`reason.${reason}`) })
      return false
    }
    finally {
      setChecking(names => withName(names, dataset.name, false))
    }
    dispatch({ type: 'ADD_DATASET_TO_MAP', payload: { dataset } })
    return true
  }, [dispatch, t])

  return { addDataset, checking }
}
