'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { Button } from '../../Button'
import { Card } from '../../Card'

export type FileMarkerAction = 'move' | 'rotate' | 'scale' | 'animate' | 'delete'

const ACTIONS: { action: FileMarkerAction; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { action: 'move', label: 'Move', Icon: LR.Move },
  { action: 'rotate', label: 'Rotate', Icon: LR.RotateCw },
  { action: 'scale', label: 'Scale', Icon: LR.Scaling },
]

// Opt-in only: nothing but a loaded model with clips can offer it.
const OPTIONAL_ACTIONS = [
  { action: 'animate' as const, label: 'Animation', Icon: LR.Play },
]

export interface PlacementActionsCardProps {
  name: string
  Icon: React.ComponentType<{ className?: string }>
  onAction?: (action: FileMarkerAction) => void
  onClose?: () => void
  /** Which placement actions this file can actually save. Omit to offer them all. */
  actions?: FileMarkerAction[]
}

/** The placement menu, shared by the floating marker and the viewport right-click. */
export function PlacementActionsCard({ name, Icon, onAction, onClose, actions }: PlacementActionsCardProps) {
  const stop = (event: React.SyntheticEvent) => event.stopPropagation()
  const offered = actions
    ? [...ACTIONS, ...OPTIONAL_ACTIONS].filter(({ action }) => actions.includes(action))
    : ACTIONS

  return (
    <div className="pointer-events-auto" onPointerDown={stop}>
      <Card className="w-44 p-1.5 shadow-lg">
        <div className="flex items-center gap-1.5 px-1 pb-1">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-xs font-medium" title={name}>{name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onPointerDown={(event) => { stop(event); onClose?.() }}
          >
            <LR.X className="h-3 w-3" />
          </Button>
        </div>
        <div className="border-t pt-1">
          {offered.map(({ action, label, Icon: ActionIcon }) => (
            <button
              key={action}
              type="button"
              onPointerDown={(event) => { stop(event); onClose?.(); onAction?.(action) }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-accent"
            >
              <ActionIcon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button
            type="button"
            onPointerDown={(event) => { stop(event); onClose?.(); onAction?.('delete') }}
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
