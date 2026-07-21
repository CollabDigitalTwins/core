'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { PluginHostProvider } from '../plugins/host/provider'

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
  PluginHostProvider,
])

export function AppProvider({ children, runtimeConfig }: { children: React.ReactNode, runtimeConfig?: RuntimeConfig }) {
  return (
    <AppConfigProvider runtimeConfig={runtimeConfig}>
      <InnerProviders>
        {children}
      </InnerProviders>
    </AppConfigProvider>
  )
}
