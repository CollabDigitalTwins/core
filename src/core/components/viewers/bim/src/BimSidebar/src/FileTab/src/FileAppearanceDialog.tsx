'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Palette } from 'lucide-react'
import * as React from 'react'

import { AddItemDialog } from '../../../../../../../ui/AddItemDialog'
import { fileNodeId } from '../../../../lib/bimTree'
import { AppearanceControls } from '../../LayersTab/src/AppearanceControls'
import { AppearanceProvider } from '../../LayersTab/src/AppearanceProvider'

import type { DbFile } from '../../../../../../../../types/dbTypes'

interface Props {
  file: DbFile | null
  onClose: () => void
}

/** Colour and opacity for every element of one loaded model. */
export function FileAppearanceDialog({ file, onClose }: Props) {
  return (
    <AddItemDialog
      open={file !== null}
      onOpenChange={open => { if (!open) onClose() }}
      title={file?.name ?? ''}
      icon={Palette}
      contentClassName="max-w-xs"
    >
      {file && (
        <AppearanceProvider>
          <AppearanceControls source="file" nodeId={fileNodeId(file.name)} />
        </AppearanceProvider>
      )}
    </AddItemDialog>
  )
}
