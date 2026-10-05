'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import type { Dataset } from '../../types/datasetTypes'

export type PluginDatasetLookup = (pluginId: string, id: string) => Dataset | undefined

/** How the SDK finds a plugin's own dataset without importing the host, which would close a cycle through `installed.ts`. */
export const PluginDatasetLookupContext = React.createContext<PluginDatasetLookup>(() => undefined)
