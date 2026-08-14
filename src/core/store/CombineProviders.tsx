'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { PluginHostProvider, type PluginHostProviderProps } from '../plugins/host/provider'

import { AppConfigProvider, type RuntimeConfig } from './AppConfig/context'
import { BimProvider } from './BIM/context'
import { BuildingsProvider } from './Buildings/context'
import { ContentProvider } from './Content/context'
import { DatasetsProvider } from './Datasets/context'
import { FilesProvider } from './Files/context'
import { MapProvider } from './Map/context'
import { MapSitesProvider } from './MapSites/context'
import { MenusProvider } from './Menus/context'
import { PermissionsProvider } from './Permissions/context'
import { PointCloudProvider } from './PointCloud/context'
import { ToolsProvider } from './Tools/context'

const compose = providers =>
  providers.reduce(
    (Prev, Curr) =>
      function ComposedProvider({ children }) {
        return (
          <Prev>
            <Curr>{children}</Curr>
          </Prev>
        )
      },
  )

// PluginHostProvider is deliberately NOT in this list: it takes props, and
// `compose` only threads `children`. It wraps the composed tree below instead, so
// it stays the innermost provider (plugins can read every store above it).
const InnerProviders = compose([
  BimProvider,
  MapProvider,
  MenusProvider,
  ToolsProvider,
  ContentProvider,
  DatasetsProvider,
  MapSitesProvider,
  FilesProvider,
  BuildingsProvider,
  PointCloudProvider,
  PermissionsProvider,
])

interface AppProviderProps extends Omit<PluginHostProviderProps, 'children'> {
  children: React.ReactNode
  runtimeConfig?: RuntimeConfig
}

export function AppProvider({
  children,
  runtimeConfig,
  plugins,
  enabledSlugs,
  configs,
}: AppProviderProps) {
  return (
    <AppConfigProvider runtimeConfig={runtimeConfig}>
      <InnerProviders>
        <PluginHostProvider plugins={plugins} enabledSlugs={enabledSlugs} configs={configs}>
          {children}
        </PluginHostProvider>
      </InnerProviders>
    </AppConfigProvider>
  )
}
