import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../../ui/Card'
import { Button } from '../../../../../../ui/Button'
import { Input } from '../../../../../../ui/Input'
import { Label } from '../../../../../../ui/Label'
import { Separator } from '../../../../../../ui/Separator'
import * as LR from 'lucide-react'

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
  const defaultScale = fileType === 'dxf' ? 0.001 : 1

  return (
    <div className="absolute bottom-10 right-0 z-50 max-w-[238px] pointer-events-auto ">
      <Card className="shadow-sm border bg-background/95 backdrop-blur-sm rounded-sm">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-1.5 min-w-0">
              <LR.Move size={14} className="text-muted-foreground shrink-0" />
              <span className="truncate">{fileType.toUpperCase()} Placement</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onCancel}
            >
              <LR.X size={13} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground truncate" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Double-click to place &bull; S / G / R to adjust
          </p>
        </CardHeader>

        <Separator />

        <CardContent className="px-4 pt-3 pb-3 space-y-2.5">
          {/* Scale row */}
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs w-12 shrink-0 text-muted-foreground">Scale</Label>
            <Input
              type="number"
              value={scale}
              onChange={e => onScaleChange(Number.parseFloat(e.target.value) || defaultScale)}
              step={fileType === 'dxf' ? '0.001' : '0.1'}
              min={fileType === 'dxf' ? '0.001' : '0.1'}
              max="10"
              className="h-7 text-xs w-28"
            />
            {fileType === 'dxf' && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onScaleChange(0.001)}
                  className="text-xs px-2 h-7"
                  title="Millimetres to metres"
                >
                  mm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onScaleChange(0.0254)}
                  className="text-xs px-2 h-7"
                  title="Inches to metres"
                >
                  in
                </Button>
              </div>
            )}
          </div>

          {/* Rotation row */}
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs w-12 shrink-0 text-muted-foreground">Rotate</Label>
            <Input
              type="number"
              value={rotation}
              onChange={e => onRotationChange(Number.parseFloat(e.target.value) || 0)}
              step="0.1"
              min="-360"
              max="360"
              className="h-7 text-xs w-28"
            />
            {/* <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRotationChange(90)}
                  className="text-xs px-2 h-7"
                >
                  +{90}°
                </Button>
            </div> */}
          </div>

          <Button
            onClick={onConfirm}
            size="sm"
            className="w-full h-7 text-xs mt-1"
          >
            <LR.Check size={12} className="mr-1" />
            Confirm Placement
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
