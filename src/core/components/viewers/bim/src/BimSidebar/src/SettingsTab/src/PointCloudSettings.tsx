'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../../../store'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { Label } from '../../../../../../../ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../../ui/Select'
import { SliderWithInput } from '../../../../../../../ui/Slider'
import {
  DEFAULT_APPEARANCE,
  POINT_SHAPES,
  POINT_SIZE_TYPES,
} from '../../../../../../shared/pointcloud/pointCloudAppearance'
import { BimPointClouds } from '../../../../PointClouds'
import { useBimPointClouds } from '../../../../PointClouds/useBimPointClouds'


import type { PointCloudAppearance } from '../../../../../../shared/pointcloud/pointCloudAppearance'

const BUDGET_STEP = 100_000

/** Point budget, size and splat shape for every cloud in the BIM scene. Hidden until one is on. */
export function PointCloudSettings() {
  const t = useTranslations('PointCloudSettings')

  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim
  const clouds = useBimPointClouds()

  const component = React.useMemo(
    () => bimComponents?.get(BimPointClouds) ?? null,
    [bimComponents],
  )

  const [appearance, setAppearance] = React.useState<PointCloudAppearance>(
    () => component?.appearance ?? { ...DEFAULT_APPEARANCE },
  )

  React.useEffect(() => {
    if (!component) return
    setAppearance(component.appearance)
    const publish = (next: PointCloudAppearance) => setAppearance(next)
    component.onAppearanceChanged.add(publish)
    return () => component.onAppearanceChanged.remove(publish)
  }, [component])

  const update = React.useCallback((patch: Partial<PointCloudAppearance>) => {
    component?.setAppearance(patch)
  }, [component])

  if (clouds.length === 0) return null

  return (
    <CollapsibleSection title={t('title')}>
      <div className="space-y-3 px-1 pb-2">
        <SliderWithInput
          label={t('pointBudget')}
          unit="M"
          value={[Math.round(appearance.pointBudget / BUDGET_STEP) / 10]}
          onValueChange={([millions]) => update({ pointBudget: millions * 1_000_000 })}
          min={0.1}
          max={20}
          step={0.1}
        />

        <SliderWithInput
          label={t('pointSize')}
          value={[appearance.size]}
          onValueChange={([size]) => update({ size })}
          min={0.1}
          max={5}
          step={0.1}
        />

        <SliderWithInput
          label={t('maxSize')}
          unit="px"
          value={[appearance.maxSize]}
          onValueChange={([maxSize]) => update({ maxSize })}
          min={1}
          max={50}
          step={1}
        />

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('sizeType')}</Label>
          <Select value={appearance.sizeType} onValueChange={(sizeType) => update({ sizeType: sizeType as never })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POINT_SIZE_TYPES.map((value) => (
                <SelectItem key={value} value={value} className="text-xs">{t(`sizeType_${value}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t('shape')}</Label>
          <Select value={appearance.shape} onValueChange={(shape) => update({ shape: shape as never })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {POINT_SHAPES.map((value) => (
                <SelectItem key={value} value={value} className="text-xs">{t(`shape_${value}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </CollapsibleSection>
  )
}
