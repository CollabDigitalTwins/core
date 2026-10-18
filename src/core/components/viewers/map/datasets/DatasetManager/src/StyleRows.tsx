"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'

import { ColourSwatch } from '../../../../../ui/ColourSwatch'
import { SliderWithInput } from '../../../../../ui/Slider'

export { LabelledSelect } from '../../../../../ui/LabelledSelect'

export function SwatchRow({ label, colour, onChange }: { label: string; colour: string; onChange: (colour: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="truncate" title={label}>{label}</span>
      <ColourSwatch label={label} value={colour} onChange={onChange} />
    </div>
  )
}

export function OpacitySlider({ opacity, onChange }: { opacity: number; onChange: (opacity: number) => void }) {
  const t = useTranslations('DatasetStyle')
  return <SliderWithInput label={t('opacity')} value={[Math.round(opacity * 100)]} onValueChange={([value]) => onChange(value / 100)} />
}
