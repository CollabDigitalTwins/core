'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { hexFromInt, intFromHex } from '../../../../../../../../utils/colourUtils'
import { Button } from '../../../../../../../ui/Button'
import { Slider } from '../../../../../../../ui/Slider'

import { useAppearance } from './AppearanceProvider'

import type { AppearanceSource } from '../../../../lib/appearanceOverrides'

const DEFAULT_PICKER_COLOR = '#73cee2'

// Above zero: an invisible element cannot be clicked to get back, and hiding is the visibility switch's job.
const MIN_OPACITY_PERCENT = 10

interface Props {
  source: AppearanceSource
  nodeId: string
}

/** Colour picker, opacity slider and reset for one appearance node. */
export function AppearanceControls({ source, nodeId }: Props) {
  const t = useTranslations('LayersTab')
  const { overrideFor, setAppearance, endCoalescing, clearNode } = useAppearance()

  const override = overrideFor(source, nodeId)
  const hex = hexFromInt(override?.color)
  const opacityPercent = Math.round((override?.opacity ?? 1) * 100)

  // Picker and slider both stream changes, so each interaction folds into one undo step.
  const onColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = intFromHex(event.target.value)
    if (next !== null) {
      setAppearance(source, nodeId, { color: next }, `color:${source}:${nodeId}`)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label
          title={t('colorTitle')}
          className="relative inline-block h-5 w-5 flex-shrink-0 cursor-pointer overflow-hidden rounded-full border border-foreground/20"
          style={{ backgroundColor: hex ?? DEFAULT_PICKER_COLOR }}
        >
          <input
            type="color"
            value={hex ?? DEFAULT_PICKER_COLOR}
            onChange={onColorChange}
            onBlur={endCoalescing}
            aria-label={t('colorTitle')}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <span className="font-mono text-xs uppercase text-muted-foreground">
          {hex ?? '—'}
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('opacityLabel')}</span>
          <span className="tabular-nums text-muted-foreground">{opacityPercent}%</span>
        </div>
        <Slider
          className="mt-2"
          value={[opacityPercent]}
          min={MIN_OPACITY_PERCENT}
          max={100}
          step={5}
          onValueChange={([next]) =>
            setAppearance(
              source,
              nodeId,
              { opacity: next / 100 },
              `opacity:${source}:${nodeId}`,
            )
          }
          onValueCommit={endCoalescing}
          aria-label={t('opacityLabel')}
        />
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          disabled={override === undefined}
          onClick={() => clearNode(source, nodeId)}
        >
          {t('resetNodeLabel')}
        </Button>
      </div>
    </div>
  )
}
