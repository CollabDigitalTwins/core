"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { formatBytes } from '../../../../../../utils/utils'
import { ProgressRing } from '../../../../../ui/ProgressRing'
import { useDatasetLoadStatus } from '../../../src/MapLayers/src/OpenDataLayer/src/datasetLoadStatus'
import { describeLoadError } from '../../src/loadErrors'

import type { LoadProgress } from '../../../../../../types/datasetTypes'
import type { DatasetFeaturesStatus } from '../../../src/MapLayers/src/OpenDataLayer/src/useDatasetFeatures'

type NoticeTranslator = ReturnType<typeof useTranslations<'DatasetLoadStatus'>>

function progressText(progress: LoadProgress | undefined, t: NoticeTranslator): string {
  if (!progress) return t('loading')
  const parts: string[] = []
  if (progress.bytes !== undefined) {
    parts.push(progress.totalBytes
      ? t('bytesOf', { loaded: formatBytes(progress.bytes), total: formatBytes(progress.totalBytes) })
      : formatBytes(progress.bytes))
  }
  if (progress.featureCount !== undefined) {
    parts.push(progress.totalFeatureCount
      ? t('featuresOf', { count: progress.featureCount, total: progress.totalFeatureCount })
      : t('featuresSoFar', { count: progress.featureCount }))
  }
  return parts.length > 0 ? parts.join(' · ') : t('loading')
}

function loadSummary(status: DatasetFeaturesStatus | undefined, t: NoticeTranslator): string | undefined {
  switch (status?.kind) {
    case 'loading': return progressText(status.progress, t)
    case 'ready': return [
      status.featureCount === undefined ? undefined : t('featuresSoFar', { count: status.featureCount }),
      status.bytes === undefined ? undefined : formatBytes(status.bytes),
    ].filter(Boolean).join(' · ') || undefined
    case 'empty': return t('reason.noData')
    case 'error': return t(`reason.${describeLoadError(status.message).reason}`)
    case 'belowMinZoom': return t('zoomIn')
    default: return undefined
  }
}

/** The ring while a dataset loads, a warning when it failed or held nothing, and the summary line under its name. */
export function useDatasetLoadDisplay(datasetName: string): { indicator: React.ReactNode; summary?: string } {
  const t = useTranslations('DatasetLoadStatus')
  const status = useDatasetLoadStatus(datasetName)
  const summary = loadSummary(status, t)
  if (status?.kind === 'loading') {
    const fraction = status.progress?.fraction
    const percent = fraction === undefined ? null : Math.round(fraction * 100)
    return { indicator: <ProgressRing size={18} progress={percent} label={summary} showPercent />, summary }
  }
  if (status?.kind === 'error' || status?.kind === 'empty') {
    return { indicator: <LR.TriangleAlert className="h-4 w-4 shrink-0 text-destructive" aria-label={summary} role="img" />, summary }
  }
  return { indicator: null, summary }
}
