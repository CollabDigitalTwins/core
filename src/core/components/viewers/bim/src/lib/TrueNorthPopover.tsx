'use client'

import * as React from 'react'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '../../../../ui/Button'
import { Input } from '../../../../ui/Input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../../ui/Popover'

interface Props {
  /** Current rotation in degrees (0-360, clockwise from default screen-up). */
  northAngle: number
  /** Whether the floorplan tool is currently waiting for a line click. */
  pickingNorth: boolean
  /** Disabled when no floorplan is active (rotation makes no sense yet). */
  disabled: boolean
  onChangeAngle: (degrees: number) => void
  onStartPick: () => void
  onCancelPick: () => void
}

/**
 * Compass-icon button + popover that lets the user set the building's
 * true north for floorplan views. Two ways to set it:
 *  1. Type a value 0-360 °.
 *  2. Click "Pick line", then click any line on the active floorplan —
 *     the line's bearing becomes the new north.
 *
 * The popover closes when the user starts a pick (so the canvas isn't
 * obscured) and stays in sync via the `northAngle` / `pickingNorth` props
 * coming from FloorplanTool.
 */
export function TrueNorthPopover({
  northAngle,
  pickingNorth,
  disabled,
  onChangeAngle,
  onStartPick,
  onCancelPick,
}: Props) {
  const t = useTranslations('ViewSection')
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<string>(formatAngle(northAngle))

  // Keep the input in sync when the angle changes from outside (e.g. line
  // pick committed a new value).
  React.useEffect(() => {
    setDraft(formatAngle(northAngle))
  }, [northAngle])

  // Close the popover automatically when the user kicks off a line pick.
  React.useEffect(() => {
    if (pickingNorth) setOpen(false)
  }, [pickingNorth])

  const commitDraft = () => {
    const value = Number(draft)
    if (!Number.isFinite(value)) {
      setDraft(formatAngle(northAngle))
      return
    }
    onChangeAngle(value)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0"
          title={t('trueNorthTitle')}
          disabled={disabled}
        >
          <LR.Compass className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('trueNorthTitle')}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">
              {t('trueNorthAngleLabel')}
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={360}
                step={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitDraft()
                    e.currentTarget.blur()
                  }
                }}
                className="h-8 text-sm"
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground">°</span>
            </div>
          </label>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-xs"
            disabled={disabled || pickingNorth}
            onClick={onStartPick}
          >
            <LR.MousePointerClick className="h-3.5 w-3.5" />
            {pickingNorth ? t('trueNorthPicking') : t('trueNorthPickLine')}
          </Button>

          {pickingNorth && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={onCancelPick}
            >
              {t('trueNorthCancelPick')}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            disabled={disabled || northAngle === 0}
            onClick={() => onChangeAngle(0)}
          >
            <LR.RotateCcw className="h-3 w-3 mr-1" />
            {t('trueNorthReset')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function formatAngle(degrees: number): string {
  // Show 0 decimals for whole numbers, 1 decimal otherwise — keeps the
  // input clean for typed values but readable after a line pick.
  const rounded = Math.round(degrees * 10) / 10
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
}
