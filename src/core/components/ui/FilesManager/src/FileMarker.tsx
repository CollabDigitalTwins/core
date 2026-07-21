'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import Image from 'next/image'
import * as React from 'react'

import { Button } from '../../Button'
import { Card } from '../../Card'

import type { DbFile } from '../../../../types/dbTypes'

export type FileMarkerAction = 'move' | 'rotate' | 'scale' | 'delete'

interface FileMarkerProps {
  file: DbFile
  onAction?: (action: FileMarkerAction) => void
  highlight?: boolean
}

const ACTIONS: { action: FileMarkerAction; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { action: 'move', label: 'Move', Icon: LR.Move },
  { action: 'rotate', label: 'Rotate', Icon: LR.RotateCw },
  { action: 'scale', label: 'Scale', Icon: LR.Scaling },
]

// Floating marker shown above a placed file (mirrors the comment/sensor markers):
// a light icon pin that opens a small actions card. Interaction is on pointer-down so
// the camera controls underneath don't swallow it.
export default function FileMarker({ file, onAction, highlight = false }: FileMarkerProps) {
  const [open, setOpen] = React.useState(false)

  const isImage = file.type.startsWith('image/') && !!file.url
  const isVideo = file.type.startsWith('video/')
  const isModel = file.type.includes('model') || /\.(obj|fbx|gltf|glb|3ds|dae|ply|stl)$/i.test(file.name)
  const isDxf = file.name.toLowerCase().endsWith('.dxf')
  const Icon = isVideo ? LR.Video : isModel ? LR.Box : isDxf ? LR.DraftingCompass : LR.FileText

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  if (!open) {
    return (
      <div
        className={`flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary shadow-md transition-transform hover:scale-105 pointer-events-auto ${
          highlight ? 'ring-2 ring-primary' : ''
        }`}
        title={file.name}
        onPointerDown={(e) => { stop(e); setOpen(true) }}
      >
        {isImage
          ? <Image width={36} height={36} src={file.url} alt={file.name} className="h-full w-full object-cover" />
          : <Icon className="h-4 w-4 text-primary-foreground" />}
      </div>
    )
  }

  return (
    <div className="pointer-events-auto" onPointerDown={stop}>
      <Card className="w-44 p-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 px-1 pb-1">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-xs font-medium" title={file.name}>{file.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onPointerDown={(e) => { stop(e); setOpen(false) }}
          >
            <LR.X className="h-3 w-3" />
          </Button>
        </div>
        <div className="border-t pt-1">
          {ACTIONS.map(({ action, label, Icon: ActionIcon }) => (
            <button
              key={action}
              type="button"
              onPointerDown={(e) => { stop(e); setOpen(false); onAction?.(action) }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-accent"
            >
              <ActionIcon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button
            type="button"
            onPointerDown={(e) => { stop(e); setOpen(false); onAction?.('delete') }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            <LR.Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </Card>
    </div>
  )
}
