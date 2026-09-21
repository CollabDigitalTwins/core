'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'

import { PlacementActionsCard } from '../../../../ui/FilesManager/src/PlacementActionsCard'

import { mapCapabilitiesForFile, mapMarkerActionsFor } from './mapPlacementTarget'

import type { DbFile } from '../../../../../types/dbTypes'
import type { FileMarkerAction } from '../../../../ui/FilesManager/src/PlacementActionsCard'

export interface MapPlacementMenuProps {
  x: number
  y: number
  file: DbFile
  is3D: boolean
  /** Whether the file is currently drawn, so the toggle reads Show or Hide. */
  isOnMap: boolean
  onAction: (action: FileMarkerAction) => void
  onClose: () => void
}

export function MapPlacementMenu({ x, y, file, is3D, isOnMap, onAction, onClose }: MapPlacementMenuProps) {
  const t = useTranslations('FileItemComponent')
  const actions: FileMarkerAction[] = [
    ...mapMarkerActionsFor(mapCapabilitiesForFile(file, is3D)),
    'view',
    'download',
  ]

  return (
    <div className="fixed z-50" style={{ left: x, top: y }}>
      <PlacementActionsCard
        name={file.name}
        Icon={is3D ? LR.Box : LR.FileText}
        actions={actions}
        labels={{
          view: isOnMap ? t('hideTitle') : t('showTitle'),
          download: t('downloadTitle'),
          delete: t('deleteTitle'),
        }}
        onAction={onAction}
        onClose={onClose}
      />
    </div>
  )
}
