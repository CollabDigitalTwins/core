'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext } from '../../../../../../../../store'
import { Label } from '../../../../../../../ui/Label'
import { SliderWithInput } from '../../../../../../../ui/Slider'
import { Switch } from '../../../../../../../ui/Switch'
import { SettingsSection } from '../../../../../../../ui/ViewerSidebar/SettingsSection'
import { BimSplats, DEFAULT_SPLAT_APPEARANCE } from '../../../../Splats'
import { useBimSplats } from '../../../../Splats/useBimSplats'

import type { SplatRenderSettings } from '../../../../../../shared/splat/splatLoader'

const DEBUG_TINT = '#66ccff'

/** Per-splat opacity, detail and debug tint, plus the renderer-wide 2D mode and blur.
 *  Hidden until a splat is on. */
export function SplatSettings() {
  const t = useTranslations('SplatSettings')

  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim
  const splats = useBimSplats()

  const component = React.useMemo(
    () => bimComponents?.get(BimSplats) ?? null,
    [bimComponents],
  )

  const [settings, setSettings] = React.useState<SplatRenderSettings | null>(null)
  const [appearanceTick, setAppearanceTick] = React.useState(0)

  React.useEffect(() => {
    if (!component) return
    setSettings(component.settings)

    const publishSettings = (next: SplatRenderSettings) => setSettings(next)
    const publishAppearance = () => setAppearanceTick((tick) => tick + 1)
    component.onSettingsChanged.add(publishSettings)
    component.onAppearanceChanged.add(publishAppearance)
    return () => {
      component.onSettingsChanged.remove(publishSettings)
      component.onAppearanceChanged.remove(publishAppearance)
    }
  }, [component])

  const appearanceOf = React.useCallback(
    (id: string) => component?.appearanceOf(id) ?? DEFAULT_SPLAT_APPEARANCE,
    // A splat's appearance lives on the component; the tick is what makes a change re-render.
    [component, appearanceTick],
  )

  if (splats.length === 0) return null

  const named = (key: string, splat: { id: string; name?: string }) =>
    splats.length > 1 ? t(`${key}Of`, { name: splat.name ?? splat.id }) : t(key)

  return (
    <SettingsSection
      icon={LR.Sparkles}
      title={t('title')}
    >
      <div className="space-y-3 px-1 pb-2">
        {splats.map((splat) => (
          <React.Fragment key={splat.id}>
            <SliderWithInput
              label={named('opacity', splat)}
              unit="%"
              value={[Math.round(appearanceOf(splat.id).opacity * 100)]}
              onValueChange={([percent]) => component?.setAppearance(splat.id, { opacity: percent / 100 })}
              min={0}
              max={100}
              step={5}
            />

            <SliderWithInput
              label={named('detail', splat)}
              value={[appearanceOf(splat.id).maxSh]}
              onValueChange={([maxSh]) => component?.setAppearance(splat.id, { maxSh })}
              min={0}
              max={3}
              step={1}
            />

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`splat-tint-${splat.id}`}>{named('debugTint', splat)}</Label>
              <Switch
                id={`splat-tint-${splat.id}`}
                checked={appearanceOf(splat.id).recolor !== DEFAULT_SPLAT_APPEARANCE.recolor}
                onCheckedChange={(on) => component?.setAppearance(splat.id, {
                  recolor: on ? DEBUG_TINT : DEFAULT_SPLAT_APPEARANCE.recolor,
                })}
              />
            </div>
          </React.Fragment>
        ))}

        {settings && (
          <>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="splat-2dgs">{t('mode2d')}</Label>
              <Switch
                id="splat-2dgs"
                checked={settings.enable2DGS}
                onCheckedChange={(enable2DGS) => component?.configure({ enable2DGS })}
              />
            </div>

            <SliderWithInput
              label={t('splatBudget')}
              unit="M"
              value={[Math.round((settings.lodSplatCount ?? 0) / 100_000) / 10]}
              onValueChange={([millions]) => component?.configure({ lodSplatCount: millions * 1_000_000 })}
              min={0.1}
              max={10}
              step={0.1}
            />

            <SliderWithInput
              label={t('blur')}
              value={[settings.blurAmount]}
              onValueChange={([blurAmount]) => component?.configure({ blurAmount })}
              min={0}
              max={1}
              step={0.05}
            />

            <SliderWithInput
              label={t('preBlur')}
              value={[settings.preBlurAmount]}
              onValueChange={([preBlurAmount]) => component?.configure({ preBlurAmount })}
              min={0}
              max={1}
              step={0.05}
            />
          </>
        )}
      </div>
    </SettingsSection>
  )
}
