'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { PLATFORM_TOUR_ID, platformTourSteps } from './platformTourSteps'

import type { ViewerKey } from '../../../types/dbTypes'
import type { TourStep } from '../tourTypes'

/** The tour Support → Guide opens on `viewer`; every viewer shares the platform overview until it has its own. */
export function useViewerTour(viewer: ViewerKey | undefined): { id: string; steps: TourStep[] } {
  const t = useTranslations('PlatformTour')
  return React.useMemo(() => ({ id: PLATFORM_TOUR_ID, steps: platformTourSteps(viewer, t) }), [viewer, t])
}
