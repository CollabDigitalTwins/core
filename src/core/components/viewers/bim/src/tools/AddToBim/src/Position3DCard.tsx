// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React from 'react'
import * as LR from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../../../../../ui/Card'
import { Button } from '../../../../../../ui/Button'
import { Input } from '../../../../../../ui/Input'
import { Label } from '../../../../../../ui/Label'
import { Separator } from '../../../../../../ui/Separator'
import { SliderWithInput } from '../../../../../../ui/Slider'

interface Position3DCardProps {
  fileType: 'dxf' | 'model'
  fileName: string
  scale: number
  rotation: number
  onScaleChange: (scale: number) => void
  onRotationChange: (rotation: number) => void
  onConfirm: () => void
  onCancel: () => void
}

const SCALE_PRESETS: { label: string, value: number, title: string }[] = [
  { label: 'mm', value: 0.001, title: 'Millimetres → metres' },
  { label: 'cm', value: 0.01, title: 'Centimetres → metres' },
  { label: 'in', value: 0.0254, title: 'Inches → metres' },
]

export default function Position3DCard({
  fileType,
  fileName,
  scale,
  rotation,
  onScaleChange,
  onRotationChange,
  onConfirm,
  onCancel,
}: Position3DCardProps) {
  const isDxf = fileType === 'dxf'
  const defaultScale = isDxf ? 0.001 : 1

  return (
    <div className="absolute bottom-10 right-4 z-50 w-64 pointer-events-auto">
      <Card className="shadow-lg border bg-background/95 backdrop-blur-sm">
        <CardHeader className="p-3 pb-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {isDxf
                ? <LR.DraftingCompass size={15} className="text-muted-foreground shrink-0" />
                : <LR.Box size={15} className="text-muted-foreground shrink-0" />}
              <span className="text-sm font-medium truncate">{fileType.toUpperCase()} placement</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancel}>
              <LR.X size={13} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground truncate" title={fileName}>{fileName}</p>
          <p className="text-[11px] text-muted-foreground/70 leading-tight">
            Double-click in the scene to place. Drag the gizmo or press G / R / S to move, rotate or scale.
          </p>
        </CardHeader>

        <Separator />

        <CardContent className="p-3 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground">Scale</Label>
              {isDxf && (
                <div className="flex gap-1">
                  {SCALE_PRESETS.map(preset => (
                    <Button
                      key={preset.label}
                      variant={Math.abs(scale - preset.value) < 1e-6 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onScaleChange(preset.value)}
                      className="text-xs px-2 h-6"
                      title={preset.title}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <Input
              type="number"
              value={scale}
              onChange={e => onScaleChange(Number.parseFloat(e.target.value) || defaultScale)}
              step={isDxf ? 0.001 : 0.1}
              min={isDxf ? 0.001 : 0.1}
              max={10}
              className="h-7 text-xs"
            />
          </div>

          <SliderWithInput
            label="Rotation"
            unit="°"
            value={[rotation]}
            onValueChange={value => onRotationChange(value[0])}
            min={0}
            max={360}
            step={1}
          />

          <Button onClick={onConfirm} size="sm" className="w-full h-8 text-xs">
            <LR.Check size={13} className="mr-1" />
            Confirm placement
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
