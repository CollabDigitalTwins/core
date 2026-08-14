// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import {
  Building2,
  BoxSelect,
  TrainTrack,
  GalleryVerticalEnd,
  Blocks,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { ViewerNames } from '../../../../types/dbTypes'
import { DataTypes } from '../../../../types/global'

export interface ViewerConfig {
  /** Key into the 'DataMenu' translation namespace, e.g. t(cfg.titleKey) */
  titleKey: string
  icon: LucideIcon
  /** Corresponding DataTypes value, undefined for viewers with no data type (map, bim, etc.) */
  dataType?: DataTypes
}

/**
 * Static config for every viewer that DataMenu renders.
 * - titleKey  → key inside the "DataMenu" i18n namespace
 * - icon      → Lucide icon component (pass size/className at the call site)
 * - dataType  → DataTypes enum value used by MoreOptions, permissions, etc.
 */
export const VIEWER_CONFIG: Partial<Record<ViewerNames, ViewerConfig>> = {
  [ViewerNames.buildings]: {
    titleKey: 'buildingHeader',
    icon: Building2,
    dataType: DataTypes.building,
  },
  [ViewerNames.sites]: {
    titleKey: 'siteHeader',
    icon: BoxSelect,
    dataType: DataTypes.site,
  },
  [ViewerNames.infrastructure]: {
    titleKey: 'infrastructureHeader',
    icon: TrainTrack,
    dataType: DataTypes.infrastructure,
  },
  [ViewerNames.files]: {
    titleKey: 'fileHeader',
    icon: GalleryVerticalEnd,
    dataType: DataTypes.file,
  },
  [ViewerNames.extensions]: {
    titleKey: 'pluginsHeader',
    icon: Blocks,
    dataType: undefined,
  },
  [ViewerNames.users]: {
    titleKey: 'usersHeader',
    icon: Users,
    dataType: DataTypes.user,
  },
}