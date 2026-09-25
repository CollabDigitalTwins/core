'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import type { DatasetFeaturesStatus } from './useDatasetFeatures'

const TOAST_DURATION_MS = 4000

/** Toasts once each time a viewport dataset drops below its min zoom or fails to load; one toast id per dataset so pans never stack them. */
export function useViewportDatasetToast(datasetName: string, status: DatasetFeaturesStatus) {
  const t = useTranslations('ViewportDatasetNotice')
  const tRef = React.useRef(t)
  React.useEffect(() => { tRef.current = t }, [t])
  const errorMessage = status.kind === 'error' ? status.message : undefined

  React.useEffect(() => {
    const id = `viewport-dataset-${datasetName}`
    if (status.kind === 'belowMinZoom') toast.info(datasetName, { id, description: tRef.current('zoomIn'), duration: TOAST_DURATION_MS })
    if (errorMessage !== undefined) toast.error(datasetName, { id, description: tRef.current('loadFailed', { reason: errorMessage }), duration: TOAST_DURATION_MS })
  }, [datasetName, status.kind, errorMessage])
}
