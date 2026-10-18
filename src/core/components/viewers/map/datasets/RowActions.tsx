"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import React from 'react'
import { toast } from 'sonner'

import { usePermissions } from '../../../../store'

// Utility functions
import { DatasetsContext } from '../../../../store'
import { Checkbox, Button } from '../../../ui/'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../ui/AlertDialog'
import { ProgressRing } from '../../../ui/ProgressRing'

import { buildPublishedTileDatasets } from './src/publishedTiles'
import { useAddDatasetToMap } from './src/useAddDatasetToMap'

// Shadcn Components

// Icons

import type { Dataset } from '../../../../types/datasetTypes'


interface RowActionsProps {
  dataset: Dataset
  isFavourite: boolean
  onFavourite: (dataset: Dataset) => void
  martinBaseUrl?: string
}

export default function RowActions({
  dataset,
  isFavourite,
  onFavourite,
  martinBaseUrl,
}: RowActionsProps) {
  const t = useTranslations('Datasets')

  // Permissions
  const { ability } = usePermissions()


  const { state: datasetsState, dispatch: datasetsDispatch } = React.useContext(DatasetsContext)
  const { addDataset, checking } = useAddDatasetToMap()
  const isChecking = checking.has(dataset.name)
  const { addedDatasets } = datasetsState.datasets
  const orgDatasets = datasetsState.datasets.datasets

  // addedDatasets is the only list OpenDataLayers renders, for every dataset type.
  const checked = addedDatasets.some(d => d.name === dataset.name)

  const handleApplyDataset = async () => {
    if (!dataset) {
      console.error('No dataset provided in RowActions')
      return
    }

    const isAdded = addedDatasets.some(d => d.name === dataset.name)

    if (isAdded) {
      datasetsDispatch({
        type: 'REMOVE_DATASET_FROM_MAP',
        payload: { datasetId: dataset.id },
      })
      toast.success(t('toastRemoved', { name: dataset.name }))
    }
    else if (await addDataset(dataset)) {
      toast.success(t('toastApplied', { name: dataset.name }))
    }
  }

  const handleFavourite = (event: React.MouseEvent) => {
    event.preventDefault()
    onFavourite(dataset)
  }

  const [publishing, setPublishing] = React.useState(false)
  const [published, setPublished] = React.useState(false)

  const isOrgMinio = typeof dataset.id === 'string' && dataset.id.startsWith('org-minio-')
  const fileId = isOrgMinio
    ? Number(String(dataset.id).slice('org-minio-'.length))
    : null

  const tiledMatch = typeof dataset.id === 'string'
    ? /^org_(\d+)_file_(\d+)$/.exec(dataset.id)
    : null
  // Converted means the row is the published tile table, or the portal dataset stamped with it.
  const tiledFileId = tiledMatch
    ? Number(tiledMatch[2])
    : (typeof dataset.publishedFileId === 'number' ? dataset.publishedFileId : null)

  const [unpublishing, setUnpublishing] = React.useState(false)
  const [unpublished, setUnpublished] = React.useState(false)

  const onUnpublish = async () => {
    if (tiledFileId == null) return
    if (!window.confirm(t('unpublishConfirm', { name: dataset.name }))) return
    setUnpublishing(true)
    try {
      const res = await fetch('/api/datasets/publish-tiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: tiledFileId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('un-publish failed', res.status, body)
        toast.error(t('toastUnpublishFailed', { error: String(body?.error ?? res.status) }))
        return
      }
      setUnpublished(true)
      datasetsDispatch({ type: 'REFRESH_ORG_DATASETS' })
      toast.success(t('toastUnpublished', { name: dataset.name }))
    }
    finally {
      setUnpublishing(false)
    }
  }

  // Never a catalog row that merely has a published copy: that is tiledFileId.
  const orgFileId = isOrgMinio
    ? fileId
    : (tiledMatch ? Number(tiledMatch[2]) : null)
  const canDelete = orgFileId != null && !Number.isNaN(orgFileId) && ability.can('delete', 'File')

  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const onDelete = async () => {
    if (orgFileId == null) return
    setDeleting(true)
    try {
      if (tiledMatch) {
        await fetch('/api/datasets/publish-tiles', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: orgFileId }),
        })
      }
      const res = await fetch(`/api/files/${orgFileId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('delete dataset failed', res.status, body)
        toast.error(t('toastDeleteFailed', { error: String(body?.error ?? res.status) }))
        return
      }
      datasetsDispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: dataset.id } })
      datasetsDispatch({ type: 'REFRESH_ORG_DATASETS' })
      toast.success(t('toastDeleted', { name: dataset.name }))
    }
    finally {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  const onPublish = async () => {
    if (fileId == null || Number.isNaN(fileId)) return
    setPublishing(true)
    try {
      const res = await fetch('/api/datasets/publish-tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('publish-tiles failed', res.status, body)
        toast.error(t('toastPublishFailed', { error: String(body?.error ?? res.status) }))
        return
      }
      const result = await res.json()
      setPublished(true)

      // Swapped optimistically: the org refetch below re-samples a tile per dataset and takes seconds.
      const tileBaseUrl = (martinBaseUrl ?? '').replace(/\/+$/, '')
      const minioId = `org-minio-${fileId}`
      const [optimistic] = buildPublishedTileDatasets(
        [{
          name: dataset.name,
          description: JSON.stringify({ tiledTable: result.table, geometryType: result.geometryType }),
        }],
        tileBaseUrl,
        { countrySubdivision: dataset.countrySubdivision ?? '', municipality: dataset.municipality ?? '' } as any,
      )
      if (optimistic) {
        const current = orgDatasets ?? []
        const swapped = current.some(d => d.id === minioId)
          ? current.map(d => (d.id === minioId ? optimistic : d))
          : [...current, optimistic]
        datasetsDispatch({ type: 'SET_DATASETS', payload: { datasets: swapped } })
        // Keep the map layer in sync if this dataset was already applied.
        if (addedDatasets.some(d => d.id === minioId)) {
          datasetsDispatch({ type: 'REMOVE_DATASET_FROM_MAP', payload: { datasetId: minioId } })
          datasetsDispatch({ type: 'ADD_DATASET_TO_MAP', payload: { dataset: optimistic } })
        }
      }

      datasetsDispatch({ type: 'REFRESH_ORG_DATASETS' })
      toast.success(t('toastPublished', {
        name: dataset.name,
        ingested: String(result.featuresIngested),
        skipped: String(result.featuresSkipped),
      }))
    }
    finally {
      setPublishing(false)
    }
  }

  // Only portal GeoJSON publishes here; uploads publish from their own row and MVT is already tiled.
  const isCatalogGeoJson =
    !isOrgMinio
    && tiledFileId == null
    && dataset.datasetType === 'GeoJSON'
    && !!dataset.portal
    && dataset.id != null

  const [publishingCatalog, setPublishingCatalog] = React.useState(false)
  const [publishedCatalog, setPublishedCatalog] = React.useState(false)

  const onPublishCatalog = async () => {
    if (!dataset.portal || dataset.id == null) return
    setPublishingCatalog(true)
    try {
      const res = await fetch('/api/datasets/publish-catalog-tiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal: dataset.portal, datasetId: dataset.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('publish-catalog-tiles failed', res.status, body)
        toast.error(t('toastPublishFailed', { error: String(body?.error ?? res.status) }))
        return
      }
      const result = await res.json()
      setPublishedCatalog(true)
      datasetsDispatch({ type: 'REFRESH_ORG_DATASETS' })
      toast.success(t('toastPublished', {
        name: dataset.name,
        ingested: String(result.featuresIngested),
        skipped: String(result.featuresSkipped),
      }))
    }
    finally {
      setPublishingCatalog(false)
    }
  }

  return (
    <div className="flex items-center flex-nowrap gap-0.5 sm:gap-1">
      <span className="relative inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center">
        <Checkbox
          checked={checked}
          disabled={isChecking || !ability.can('read', 'File')}
          onCheckedChange={() => {
            void handleApplyDataset()
          }}
          className="opacity-70 hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity duration-200"
        />
        {isChecking && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <ProgressRing progress={null} size={16} label={t('checkingDataset')} />
          </span>
        )}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 sm:h-9 sm:w-9 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent ${isFavourite ? 'opacity-100' : ''}`}
        onClick={handleFavourite}
        disabled={!ability.can('read', 'File')}
      >
        <LR.Star
          color={`${isFavourite ? 'hsl(var(--chart-5))' : 'black'} `}
          fill={`${isFavourite ? 'hsl(var(--chart-5))' : 'none'} `}
        />
      </Button>

      {isOrgMinio && (
        <Button
          variant="ghost"
          size="icon"
          title={published ? t('publishedTooltip') : t('publishTooltip')}
          className="h-8 w-8 sm:h-9 sm:w-9 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
          onClick={() => void onPublish()}
          disabled={publishing || published || !ability.can('update', 'File')}
        >
          <LR.UploadCloud color={published ? 'hsl(var(--chart-2))' : 'black'} />
        </Button>
      )}

      {isCatalogGeoJson && (
        <Button
          variant="ghost"
          size="icon"
          title={publishedCatalog ? t('publishedTooltip') : t('publishCatalogTooltip')}
          className="h-8 w-8 sm:h-9 sm:w-9 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
          onClick={() => void onPublishCatalog()}
          disabled={publishingCatalog || publishedCatalog || !ability.can('update', 'File')}
        >
          <LR.CloudDownload color={publishedCatalog ? 'hsl(var(--chart-2))' : 'black'} />
        </Button>
      )}

      {tiledFileId != null && (
        <Button
          variant="ghost"
          size="icon"
          title={unpublished ? t('unpublishedTooltip') : t('unpublishTooltip')}
          className="h-8 w-8 sm:h-9 sm:w-9 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
          onClick={() => void onUnpublish()}
          disabled={unpublishing || unpublished || !ability.can('update', 'File')}
        >
          <LR.CloudOff color={unpublished ? 'hsl(var(--chart-5))' : 'black'} />
        </Button>
      )}

      {canDelete && (
        <>
          <Button
            variant="ghost"
            size="icon"
            title={t('deleteDataset')}
            className="h-8 w-8 sm:h-9 sm:w-9 opacity-70 hover:opacity-100 transition-opacity duration-200 hover:bg-transparent"
            onClick={() => setConfirmingDelete(true)}
            disabled={deleting}
          >
            <LR.Trash2 color="black" />
          </Button>

          <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteTitle', { name: dataset.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t('deleteCancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onDelete()} disabled={deleting}>
                  {t('deleteConfirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
