"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'

import { SliderWithInput } from '../../../../../ui/Slider'

import { fieldLabel } from './fieldLabel'
import { LabelledSelect, OpacitySlider, SwatchRow } from './StyleRows'

import type { DatasetStyle, FieldProfile, LayerGeometryType } from '../../../../../../types/datasetTypes'

const NO_LABEL = '__none'

interface LayerStyleControlsProps {
  style: DatasetStyle
  fields: FieldProfile[]
  layerType?: LayerGeometryType
  onChange: (changes: Partial<DatasetStyle>) => void
}

/** Opacity, border, size and label settings that apply whatever the colouring. */
export function LayerStyleControls({ style, fields, layerType, onChange }: LayerStyleControlsProps) {
  const t = useTranslations('DatasetStyle')
  const isPoints = layerType === 'circle'
  const isLines = layerType === 'line'

  return (
    <div className="flex flex-col gap-3">
      <OpacitySlider opacity={style.opacity} onChange={opacity => onChange({ opacity })} />
      {!isLines && <SwatchRow label={t('borderColour')} colour={style.strokeColour} onChange={strokeColour => onChange({ strokeColour })} />}
      {!isLines && <SliderWithInput label={t('borderWidth')} min={0} max={10} step={0.5} value={[style.strokeWidth]} onValueChange={([strokeWidth]) => onChange({ strokeWidth })} />}
      {isPoints && <SliderWithInput label={t('pointSize')} min={1} max={30} value={[style.pointRadius]} onValueChange={([pointRadius]) => onChange({ pointRadius })} />}
      {isLines && <SliderWithInput label={t('lineWidth')} min={0.5} max={20} step={0.5} value={[style.lineWidth]} onValueChange={([lineWidth]) => onChange({ lineWidth })} />}
      <LabelledSelect
        label={t('labels')}
        value={style.label?.field ?? NO_LABEL}
        options={[{ value: NO_LABEL, label: t('noLabels') }, ...fields.map(field => ({ value: field.name, label: fieldLabel(field) }))]}
        onChange={field => onChange({ label: field === NO_LABEL ? undefined : { field, size: style.label?.size ?? 12, colour: style.label?.colour ?? '#111827' } })}
      />
    </div>
  )
}
