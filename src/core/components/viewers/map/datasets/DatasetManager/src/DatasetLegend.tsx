"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { LegendRows } from '../../../../../ui/LegendRows'
import { rendererLegend } from '../../../utils/datasetStyle'
import { fetchWithProxyFallback } from '../../src/http'
import { sliceLegendImage } from '../../src/legendImage'
import { wmsLegendUrl } from '../../src/wmsTime'

import type { Dataset, ServiceLegend } from '../../../../../../types/datasetTypes'
import type { LegendRowEntry } from '../../../../../ui/LegendRows'

const COMPACT_ENTRIES = 8
const LABEL_SCALE = 1.5

function serviceLegend(dataset: Dataset): ServiceLegend | undefined {
  if (dataset.legend) return dataset.legend
  return dataset.wms ? { imageUrl: wmsLegendUrl(dataset.wms.baseUrl, dataset.wms.layers.split(',')[0]) } : undefined
}

interface SlicedEntry {
  colour: string
  labelUrl: string
  width: number
  height: number
}

async function sliceLegendUrl(src: string): Promise<SlicedEntry[] | null> {
  const response = await fetchWithProxyFallback(src)
  if (!response.ok) return null
  const bitmap = await createImageBitmap(await response.blob())
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(bitmap, 0, 0)
  const slices = sliceLegendImage(context.getImageData(0, 0, canvas.width, canvas.height))
  return slices?.map(({ colour, label }) => {
    const crop = document.createElement('canvas')
    crop.width = label.width
    crop.height = label.height
    crop.getContext('2d')?.drawImage(canvas, label.x, label.y, label.width, label.height, 0, 0, label.width, label.height)
    return { colour, labelUrl: crop.toDataURL(), width: label.width, height: label.height }
  }) ?? null
}

// Undefined while the image is read; null when it isn't swatches stacked beside labels.
function useSlicedLegend(src: string): SlicedEntry[] | null | undefined {
  const [sliced, setSliced] = React.useState<SlicedEntry[] | null | undefined>(undefined)
  React.useEffect(() => {
    let cancelled = false
    sliceLegendUrl(src).then(
      (entries) => { if (!cancelled) setSliced(entries) },
      () => { if (!cancelled) setSliced(null) },
    )
    return () => { cancelled = true }
  }, [src])
  return sliced
}

function LegendImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = React.useState(false)
  const sliced = useSlicedLegend(src)
  if (failed || sliced === undefined) return null
  if (!sliced) return <img src={src} alt={alt} onError={() => setFailed(true)} className="max-w-full" />
  const rows = sliced.map((entry, i) => ({
    label: `${alt} ${i + 1}`,
    swatch: entry.colour,
    labelContent: <img src={entry.labelUrl} alt="" width={entry.width * LABEL_SCALE} height={entry.height * LABEL_SCALE} className="shrink-0" />,
  }))
  return <LegendRows rows={rows} aria-label={alt} />
}

function EntryList({ entries, compact }: { entries: LegendRowEntry[]; compact?: boolean }) {
  const t = useTranslations('DatasetStyle')
  return (
    <LegendRows
      rows={entries}
      limit={compact ? COMPACT_ENTRIES : undefined}
      moreLabel={count => t('moreEntries', { count })}
      aria-label={t('legend')}
    />
  )
}

/** The key for a dataset's current colouring: swatches for vector renderers, the service's own images for map services. */
export function DatasetLegend({ dataset, compact }: { dataset: Dataset; compact?: boolean }) {
  const t = useTranslations('DatasetStyle')
  const service = serviceLegend(dataset)
  if (service?.items) {
    const entries = service.items.map(item => ({
      label: item.label,
      swatch: item.imageUrl
        ? <img src={item.imageUrl} alt="" className="h-4 w-4 shrink-0 object-contain" />
        : <span className="h-3 w-3 shrink-0 rounded-sm border border-gray-300" style={{ background: item.colour }} />,
    }))
    return <EntryList entries={entries} compact={compact} />
  }
  if (service?.imageUrl) return <LegendImage key={service.imageUrl} src={service.imageUrl} alt={t('legend')} />
  if (!dataset.style) return null
  const opacity = dataset.style.opacity
  const entries = rendererLegend(dataset.style.renderer, { yes: t('yes'), no: t('no'), other: t('other'), noData: t('noData') })
    .map(entry => ({ label: entry.label, swatch: <span className="h-3 w-3 shrink-0 rounded-sm border border-gray-300" style={{ background: entry.colour, opacity }} /> }))
  return entries.length > 0 ? <EntryList entries={entries} compact={compact} /> : null
}
