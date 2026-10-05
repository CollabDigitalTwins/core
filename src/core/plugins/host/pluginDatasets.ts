'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginContributions } from './provider'
import { toPluginDataset } from './toPluginDataset'

import type { Dataset } from '../../types/datasetTypes'

/** Every enabled plugin's datasets, for the lists in the Datasets menu and the Layers tab. */
export function usePluginDatasets(organization?: number): Dataset[] {
  const registrations = usePluginContributions('map.datasets')

  return React.useMemo(
    () => registrations.map(registration => toPluginDataset(registration, organization)),
    [registrations, organization],
  )
}
