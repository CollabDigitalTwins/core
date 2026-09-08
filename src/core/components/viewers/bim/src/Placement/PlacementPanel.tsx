'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { Button } from '../../../../ui/Button'
import { Card, CardContent, CardHeader } from '../../../../ui/Card'
import { Label } from '../../../../ui/Label'
import { Separator } from '../../../../ui/Separator'

import { NumberField } from './NumberField'

import type { PlacementMode } from './PlacementEditor'
import type { PlacementCapabilities } from './placementTarget'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const AXES = ['X', 'Y', 'Z'] as const

// The card is Z-up like the BIM authoring tools; the scene is Y-up. Index by display axis.
const WORLD_AXIS = [0, 2, 1] as const

const YAW_AXIS = 1

// Drawing units, as a metre-scale factor. The same presets the old DXF card offered.
const UNIT_PRESETS = [
  { unit: 'mm', value: 0.001 },
  { unit: 'cm', value: 0.01 },
  { unit: 'm', value: 1 },
  { unit: 'in', value: 0.0254 },
] as const

const MODES: { mode: PlacementMode; icon: React.ComponentType<{ size?: number }>; key: string }[] = [
  { mode: 'translate', icon: LR.Move3d, key: 'G' },
  { mode: 'rotate', icon: LR.Rotate3d, key: 'R' },
  { mode: 'scale', icon: LR.Scale3d, key: 'S' },
]

export interface PlacementPanelProps {
  name: string
  capabilities: PlacementCapabilities
  placement: PointCloudPlacement
  mode: PlacementMode
  labels: Record<string, string>
  onModeChange: (mode: PlacementMode) => void
  onPlacementChange: (placement: PointCloudPlacement) => void
  onCentre: () => void
  onPickPivot: () => void
  onClearPivot: () => void
  hasPivot: boolean
  onDone: () => void
  onReset: () => void
  /** Shown under the name, for a phase that needs an instruction. */
  hint?: string
  /** Restricts the modes offered. Defaults to everything the capabilities allow. */
  availableModes?: PlacementMode[]
  /** False while placing a new file, which has no pivot to turn about yet. */
  allowPivot?: boolean
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
            <NumberField
              label={`${label} ${axis}`}
              value={values[WORLD_AXIS[index]]}
              step={step}
              onCommit={(next) => onChange(WORLD_AXIS[index], next)}
              className="h-7 pl-5 text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Rotation and scale otherwise turn about the target's own origin, which on a georeferenced scan
 *  sits far outside the points. */
function PivotControl({
  hasPivot,
  labels,
  onPick,
  onClear,
}: {
  hasPivot: boolean
  labels: Record<string, string>
  onPick: () => void
  onClear: () => void
}) {
  return (
    <div className="space-y-1">
      <Button variant="outline" size="sm" className="h-7 w-full text-xs" onClick={onPick}>
        <LR.Crosshair size={13} className="mr-1" />
        {labels.pickPivot}
      </Button>
      {hasPivot && (
        <div className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
            {labels.pivotSet}
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={onClear}>
            {labels.pivotOrigin}
          </Button>
        </div>
      )}
    </div>
  )
}

export function PlacementPanel({
  name,
  capabilities,
  placement,
  mode,
  labels,
  onModeChange,
  onPlacementChange,
  onCentre,
  onPickPivot,
  onClearPivot,
  hasPivot,
  onDone,
  onReset,
  hint,
  availableModes,
  allowPivot = true,
}: PlacementPanelProps) {
  const modes = MODES
    .filter(({ mode: value }) => value !== 'scale' || capabilities.scale)
    .filter(({ mode: value }) => !availableModes || availableModes.includes(value))

  const setAxis = (key: 'position' | 'rotation', index: number, value: number) => {
    const next: [number, number, number] = [...placement[key]]
    next[index] = key === 'rotation' ? toRadians(value) : value
    onPlacementChange({ ...placement, [key]: next })
  }

  const pivot = allowPivot
    ? <PivotControl hasPivot={hasPivot} labels={labels} onPick={onPickPivot} onClear={onClearPivot} />
    : null

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-12 z-50 w-72 pointer-events-auto">
      <Card className="shadow-lg border bg-background/95 backdrop-blur-sm">
        <CardHeader className="p-3 pb-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <LR.Move size={15} className="shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{labels.title}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDone}>
              <LR.X size={13} />
            </Button>
          </div>
          <p className="truncate text-xs text-muted-foreground" title={name}>{name}</p>
          {hint && (
            <p className="text-[11px] leading-tight text-muted-foreground/70">{hint}</p>
          )}
          <div className="flex gap-1">
            {modes.map(({ mode: value, icon: Icon, key }) => (
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
          {mode === 'translate' && (
            <div className="space-y-1.5">
              <NumberRow
                label={labels.position}
                values={placement.position.map(round) as [number, number, number]}
                step={0.1}
                onChange={(index, value) => setAxis('position', index, value)}
              />
              {allowPivot && (
                <Button variant="outline" size="sm" className="h-7 w-full text-xs" onClick={onCentre}>
                  <LR.LocateFixed size={13} className="mr-1" />
                  {labels.centre}
                </Button>
              )}
              {pivot}
            </div>
          )}
          {mode === 'rotate' && (
            <div className="space-y-1.5">
              {capabilities.rotation === 'full' ? (
                <NumberRow
                  label={labels.rotation}
                  values={placement.rotation.map(toDegrees) as [number, number, number]}
                  step={1}
                  onChange={(index, value) => setAxis('rotation', index, value)}
                />
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{labels.yaw}</Label>
                  <NumberField
                    label={labels.yaw}
                    value={toDegrees(placement.rotation[YAW_AXIS])}
                    step={1}
                    onCommit={(next) => setAxis('rotation', YAW_AXIS, next)}
                    className="h-7 text-xs"
                  />
                </div>
              )}
              {pivot}
            </div>
          )}
          {mode === 'scale' && capabilities.scale && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">{labels.scale}</Label>
                <div className="flex gap-1">
                  {UNIT_PRESETS.map(({ unit, value }) => (
                    <Button
                      key={unit}
                      variant={round(placement.scale) === value ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 px-1.5 text-[10px]"
                      title={labels[`unit_${unit}`] ?? unit}
                      onClick={() => onPlacementChange({ ...placement, scale: value })}
                    >
                      {unit}
                    </Button>
                  ))}
                </div>
              </div>
              <NumberField
                label={labels.scale}
                value={round(placement.scale)}
                step={placement.scale < 0.1 ? 0.001 : 0.01}
                min={0.001}
                onCommit={(next) => { if (next > 0) onPlacementChange({ ...placement, scale: next }) }}
                className="h-7 text-xs"
              />
              {pivot}
            </div>
          )}

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
