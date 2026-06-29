'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { AppConfigProvider } from './AppConfig/context'
import { BimProvider } from './BIM/context'
import { ContentProvider } from './Content/context'
import { MapProvider } from './Map/context'
import { MenusProvider } from './Menus/context'
import { ToolsProvider } from './Tools/context'
import { FilesProvider } from './Files/context'
import { BuildingsProvider } from './Buildings/context'
import { DatasetsProvider } from './Datasets/context'
import { MapSitesProvider } from './MapSites/context'
import { PointCloudProvider } from './PointCloud/context'
import { PermissionsProvider } from './Permissions/context'
import { PluginHostProvider } from '../plugins/host/provider'

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

export const AppProvider = compose([
  AppConfigProvider,
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
compose.displayName = 'compose'
