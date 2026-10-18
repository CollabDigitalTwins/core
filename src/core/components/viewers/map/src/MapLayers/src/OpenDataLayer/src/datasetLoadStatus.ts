'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { DatasetsContext } from '../../../../../../../../store/Datasets/context'
import { createKeyedStore } from '../../../../../../../../utils/keyedStore'
import { datasetNoticeId, describeLoadError, type LoadErrorDescription } from '../../../../../datasets/src/loadErrors'
import { markDatasetUnavailable, type UnavailableReason } from '../../../../../datasets/src/unavailableDatasets'

import type { DatasetFeaturesStatus } from './useDatasetFeatures'
import type { Dataset } from '../../../../../../../../types/datasetTypes'

const TOAST_DURATION_MS = 4000

const statuses = createKeyedStore<DatasetFeaturesStatus>()

export function setDatasetLoadStatus(datasetName: string, status: DatasetFeaturesStatus) {
  statuses.set(datasetName, status)
}

export function clearDatasetLoadStatus(datasetName: string) {
  statuses.delete(datasetName)
}

/** The latest load status a map layer reported for `datasetName`, or undefined before it starts. */
export function useDatasetLoadStatus(datasetName: string): DatasetFeaturesStatus | undefined {
  return statuses.useValue(datasetName)
}

const EMPTY_LOAD: LoadErrorDescription = { reason: 'noData', permanent: true }

function loadFailure(status: DatasetFeaturesStatus): LoadErrorDescription | undefined {
  if (status.kind === 'empty') return EMPTY_LOAD
  return status.kind === 'error' ? describeLoadError(status.message) : undefined
}

function unavailableReason(status: DatasetFeaturesStatus, failure: LoadErrorDescription): UnavailableReason {
  if (status.kind === 'empty') return 'empty'
  return failure.permanent ? 'denied' : 'failed'
}

function useLoadNotices(datasetName: string, status: DatasetFeaturesStatus) {
  const t = useTranslations('DatasetLoadStatus')
  const tRef = React.useRef(t)
  React.useEffect(() => { tRef.current = t }, [t])
  const failure = loadFailure(status)
  const failureReason = failure?.reason
  const removed = failure?.permanent === true
  const truncatedAt = status.kind === 'ready' ? status.truncatedAt : undefined

  React.useEffect(() => {
    const id = datasetNoticeId(datasetName)
    if (status.kind === 'belowMinZoom') toast.info(datasetName, { id, description: tRef.current('zoomIn'), duration: TOAST_DURATION_MS })
    if (truncatedAt !== undefined) toast.warning(datasetName, { id, description: tRef.current('truncated', { count: truncatedAt }), duration: TOAST_DURATION_MS })
    if (failureReason === undefined) return
    const reason = tRef.current(`reason.${failureReason}`)
    toast.error(datasetName, { id, description: removed ? tRef.current('removed', { reason }) : reason, duration: TOAST_DURATION_MS })
  }, [datasetName, status.kind, failureReason, removed, truncatedAt])
}

/** Reports a map layer's status to the layer list while mounted and toasts notices; a load that can never succeed leaves the map and the catalogue. */
export function useReportedLoadStatus(dataset: Pick<Dataset, 'id' | 'name' | 'portal'>, status: DatasetFeaturesStatus) {
  const { dispatch } = React.useContext(DatasetsContext)
  const datasetRef = React.useRef(dataset)
  React.useEffect(() => { datasetRef.current = dataset }, [dataset])
  const { name } = dataset
  useLoadNotices(name, status)

  React.useEffect(() => {
    setDatasetLoadStatus(name, status)
    const failure = loadFailure(status)
    if (!failure) return
    markDatasetUnavailable(datasetRef.current, unavailableReason(status, failure))
    if (failure.permanent) dispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: datasetRef.current.id } })
  }, [name, status, dispatch])

  React.useEffect(() => () => clearDatasetLoadStatus(name), [name])
}
