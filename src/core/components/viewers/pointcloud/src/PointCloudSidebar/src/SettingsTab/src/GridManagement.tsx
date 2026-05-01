'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { SliderWithInput } from '../../../../../../../ui/Slider'
import { ColorInput } from '../../../../../../../ui/Input'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import * as LR from 'lucide-react'
import * as THREE from 'three'

export function GridManagement() {
  // Translation
  const t = useTranslations('GridManagement')

  // Use lazy initialization to get values from grid
  const [gridVisible, setGridVisible] = React.useState<boolean>(true)
  const [gridColor, setGridColor] = React.useState<string>(() => '#bbbbbb')
  const [primarySize, setPrimarySize] = React.useState<number[]>(() => [1])
  const [secondarySize, setSecondarySize] = React.useState<number[]>(() => [10])
  const [elevation, setElevation] = React.useState<number[]>(() => [0])
  const [rotationY, setRotationZ] = React.useState<number[]>(() => [0])

  return (
    <CollapsibleSection
      title={t('gridTitle')}
      chevronPosition="right"
      icon={LR.Grid3X3}
      switchVariant={{
        checked: true,
        onCheckedChange: setGridVisible,
        disabled: false,
      }}
      defaultOpen={false}
    >
      <div className="space-y-4">
        {/* Grid Color */}
        <div className="space-y-2">
          <label className={`text-sm font-medium ${gridVisible ? '' : 'text-gray-400'}`}>Grid Color</label>
          <div className={`p-2 border rounded-md ${gridVisible ? 'bg-white' : 'bg-gray-100'}`}>
            <ColorInput
              value={gridColor}
              onChange={e => setGridColor(e.target.value)}
              disabled={!gridVisible}
              defaultColor="#bbbbbb"
            />
          </div>
        </div>

        {/* Grid Primary Size */}
        <SliderWithInput
          label={t('primaryLabel')}
          value={primarySize}
          onValueChange={setPrimarySize}
          min={0}
          max={10}
          step={0.1}
          disabled={!gridVisible}
        />

        {/* Grid Secondary Size */}
        <SliderWithInput
          label={t('secondaryLabel')}
          value={secondarySize}
          onValueChange={setSecondarySize}
          min={0}
          max={20}
          step={0.1}
          disabled={!gridVisible}
        />

        {/* Grid Elevation */}
        <SliderWithInput
          label={t('elevationLabel')}
          value={elevation}
          onValueChange={setElevation}
          min={-50}
          max={50}
          step={0.5}
          unit="m"
          disabled={!gridVisible}
        />

        {/* Grid Rotation */}
        <SliderWithInput
          label={t('rotationLabel')}
          value={rotationY}
          onValueChange={setRotationZ}
          min={-360}
          max={360}
          step={1}
          unit="°"
          disabled={!gridVisible}
        />
      </div>
    </CollapsibleSection>
  )
}
