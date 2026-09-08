'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import Image from 'next/image'
import * as React from 'react'

import { PlacementActionsCard } from './PlacementActionsCard'

import type { FileMarkerAction } from './PlacementActionsCard'
import type { DbFile } from '../../../../types/dbTypes'

export type { FileMarkerAction }

interface FileMarkerProps {
  file: DbFile
  onAction?: (action: FileMarkerAction) => void
  highlight?: boolean
  /** Which placement actions this file can actually save. Omit to offer them all. */
  actions?: FileMarkerAction[]
}

// An icon pin above a placed file that opens the placement card; pointer-down so the camera controls cannot swallow it.
export default function FileMarker({ file, onAction, highlight = false, actions }: FileMarkerProps) {
  const [open, setOpen] = React.useState(false)

  const isImage = file.type.startsWith('image/') && !!file.url
  const isVideo = file.type.startsWith('video/')
  const isModel = file.type.includes('model') || /\.(obj|fbx|gltf|glb|3ds|dae|ply|stl)$/i.test(file.name)
  const isDxf = file.name.toLowerCase().endsWith('.dxf')
  const Icon = isVideo ? LR.Video : isModel ? LR.Box : isDxf ? LR.DraftingCompass : LR.FileText

  if (!open) {
    return (
      <div
        className={`flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary shadow-md transition-transform hover:scale-105 pointer-events-auto ${
          highlight ? 'ring-2 ring-primary' : ''
        }`}
        title={file.name}
        onPointerDown={(event) => { event.stopPropagation(); setOpen(true) }}
      >
        {isImage
          ? <Image width={36} height={36} src={file.url} alt={file.name} className="h-full w-full object-cover" />
          : <Icon className="h-4 w-4 text-primary-foreground" />}
      </div>
    )
  }

  return (
    <PlacementActionsCard
      name={file.name}
      Icon={Icon}
      actions={actions}
      onAction={onAction}
      onClose={() => setOpen(false)}
    />
  )
}
