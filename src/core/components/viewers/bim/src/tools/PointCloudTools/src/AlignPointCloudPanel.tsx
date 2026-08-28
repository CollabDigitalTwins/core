'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { Button } from '../../../../../../ui/Button'
import { Card, CardContent, CardHeader } from '../../../../../../ui/Card'
import { Input } from '../../../../../../ui/Input'
import { Label } from '../../../../../../ui/Label'
import { Separator } from '../../../../../../ui/Separator'

import type { PointCloudPlacement } from '../../../../../shared/pointcloud/pointCloudPlacement'
import type { AlignmentMode } from '../../../PointClouds/PointCloudAlignment'

const AXES = ['X', 'Y', 'Z'] as const

// The card is Z-up like the BIM authoring tools; the scene is Y-up. Index by display axis.
const WORLD_AXIS = [0, 2, 1] as const

const MODES: { mode: AlignmentMode; icon: React.ComponentType<{ size?: number }>; key: string }[] = [
  { mode: 'translate', icon: LR.Move3d, key: 'G' },
  { mode: 'rotate', icon: LR.Rotate3d, key: 'R' },
  { mode: 'scale', icon: LR.Scale3d, key: 'S' },
]

export interface AlignPointCloudPanelProps {
  name: string
  placement: PointCloudPlacement
  mode: AlignmentMode
  labels: Record<string, string>
  onModeChange: (mode: AlignmentMode) => void
  onPlacementChange: (placement: PointCloudPlacement) => void
  onDone: () => void
  onReset: () => void
}

const toDegrees = (radians: number) => Math.round((radians * 180) / Math.PI * 100) / 100
const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const round = (value: number) => Math.round(value * 1000) / 1000

function NumberRow({
  label,
  values,
  step,
  onChange,
}: {
  label: string
  values: [number, number, number]
  step: number
  onChange: (index: number, value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {AXES.map((axis, index) => (
          <div key={axis} className="relative">
            <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70">
              {axis}
            </span>
            <Input
              type="number"
              aria-label={`${label} ${axis}`}
              value={values[WORLD_AXIS[index]]}
              step={step}
              onChange={(event) => onChange(WORLD_AXIS[index], Number.parseFloat(event.target.value) || 0)}
              className="h-7 pl-5 text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AlignPointCloudPanel({
  name,
  placement,
  mode,
  labels,
  onModeChange,
  onPlacementChange,
  onDone,
  onReset,
}: AlignPointCloudPanelProps) {
  const setAxis = (key: 'position' | 'rotation', index: number, value: number) => {
    const next: [number, number, number] = [...placement[key]]
    next[index] = key === 'rotation' ? toRadians(value) : value
    onPlacementChange({ ...placement, [key]: next })
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-12 z-50 w-72 pointer-events-auto">
      <Card className="shadow-lg border bg-background/95 backdrop-blur-sm">
        <CardHeader className="p-3 pb-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <LR.Grip size={15} className="shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{labels.title}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDone}>
              <LR.X size={13} />
            </Button>
          </div>
          <p className="truncate text-xs text-muted-foreground" title={name}>{name}</p>
          <div className="flex gap-1">
            {MODES.map(({ mode: value, icon: Icon, key }) => (
              <Button
                key={value}
                variant={mode === value ? 'default' : 'outline'}
                size="sm"
                className="h-6 flex-1 px-2 text-xs"
                title={`${labels[value]} (${key})`}
                onClick={() => onModeChange(value)}
              >
                <Icon size={12} />
              </Button>
            ))}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-3 p-3">
          <NumberRow
            label={labels.position}
            values={placement.position.map(round) as [number, number, number]}
            step={0.1}
            onChange={(index, value) => setAxis('position', index, value)}
          />
          <NumberRow
            label={labels.rotation}
            values={placement.rotation.map(toDegrees) as [number, number, number]}
            step={1}
            onChange={(index, value) => setAxis('rotation', index, value)}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{labels.scale}</Label>
            <Input
              type="number"
              aria-label={labels.scale}
              value={round(placement.scale)}
              step={0.01}
              min={0.001}
              onChange={(event) => {
                const scale = Number.parseFloat(event.target.value)
                if (Number.isFinite(scale) && scale > 0) onPlacementChange({ ...placement, scale })
              }}
              className="h-7 text-xs"
            />
          </div>

          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={onReset}>
              <LR.Undo2 size={13} className="mr-1" />
              {labels.reset}
            </Button>
            <Button size="sm" className="h-8 flex-1 text-xs" onClick={onDone}>
              <LR.Check size={13} className="mr-1" />
              {labels.done}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
