'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { SliderWithInput } from '../../../../../../../ui/Slider'
import { ColorInput } from '../../../../../../../ui/Input'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { BimContext } from '../../../../../../../../store'
import * as THREE from 'three'

export function GridManagement() {
  // Translation
  const t = useTranslations('GridManagement')

  const { dispatch: bimDispatch, state: bimState } = React.useContext(BimContext)
  const { grid } = bimState.bim

  // Use lazy initialization to get values from grid
  const [gridVisible, setGridVisible] = React.useState(() => {
    return grid?.config?.visible ?? true
  })
  const [gridColor, setGridColor] = React.useState(() => {
    return grid?.config?.color ? `#${grid.config.color.getHexString()}` : '#bbbbbb'
  })
  const [primarySize, setPrimarySize] = React.useState(() => {
    return [grid?.config?.primarySize ?? 1]
  })
  const [secondarySize, setSecondarySize] = React.useState(() => {
    return [grid?.config?.secondarySize ?? 10]
  })
  const [elevation, setElevation] = React.useState(() => {
    return [grid?.three?.position?.y ?? 0]
  })
  const [rotationY, setRotationZ] = React.useState(() => {
    const rotationDegrees = grid?.three?.rotation?.y ? (grid.three.rotation.y * 180) / Math.PI : 0
    return [rotationDegrees]
  })

  // Track if we've initialized to prevent re-initialization
  const [initialized, setInitialized] = React.useState(false)

  // Initialize state with current grid values (only once)
  React.useEffect(() => {
    if (!grid || initialized) return

    // Load all values from grid in one go
    if (grid.config) {
      setGridVisible(grid.config.visible ?? true)
      setPrimarySize([grid.config.primarySize ?? 1])
      setSecondarySize([grid.config.secondarySize ?? 10])
      if (grid.config.color) {
        setGridColor(`#${grid.config.color.getHexString()}`)
      }
    }

    if (grid.three) {
      if (grid.three.position) {
        setElevation([grid.three.position.y ?? 0])
      }
      if (grid.three.rotation) {
        const rotationDegrees = (grid.three.rotation.y * 180) / Math.PI
        setRotationZ([rotationDegrees ?? 0])
      }
    }

    setInitialized(true)
  }, [grid, initialized])

  // Update grid visibility when changed
  React.useEffect(() => {
    if (!grid?.config || !initialized) return

    const currentVisible = grid.config.visible ?? true
    if (currentVisible !== gridVisible) {
      grid.config.visible = gridVisible
      bimDispatch({
        type: 'SET_GRID',
        payload: { grid },
      })
    }
  }, [gridVisible, grid, initialized, bimDispatch])

  // Update grid color when changed
  React.useEffect(() => {
    if (!grid?.config || !initialized) return

    const currentColor = grid.config.color ? `#${grid.config.color.getHexString()}` : '#bbbbbb'
    if (currentColor !== gridColor) {
      grid.config.color = new THREE.Color(gridColor)
      bimDispatch({
        type: 'SET_GRID',
        payload: { grid },
      })
    }
  }, [gridColor, grid, initialized, bimDispatch])

  // Update grid primary size when changed
  React.useEffect(() => {
    if (!grid?.config || !initialized) return

    const currentPrimarySize = grid.config.primarySize ?? 1
    if (currentPrimarySize !== primarySize[0]) {
      grid.config.primarySize = primarySize[0]
      bimDispatch({
        type: 'SET_GRID',
        payload: { grid },
      })
    }
  }, [primarySize, grid, initialized, bimDispatch])

  // Update grid secondary size when changed
  React.useEffect(() => {
    if (!grid?.config || !initialized) return

    const currentSecondarySize = grid.config.secondarySize ?? 10
    if (currentSecondarySize !== secondarySize[0]) {
      grid.config.secondarySize = secondarySize[0]
      bimDispatch({
        type: 'SET_GRID',
        payload: { grid },
      })
    }
  }, [secondarySize, grid, initialized, bimDispatch])

  // Update grid elevation when changed
  React.useEffect(() => {
    if (!grid?.three?.position || !initialized) return

    const currentElevation = grid.three.position.y ?? 0
    if (currentElevation !== elevation[0]) {
      grid.three.position.y = elevation[0]
      bimDispatch({
        type: 'SET_GRID',
        payload: { grid },
      })
    }
  }, [elevation, grid, initialized, bimDispatch])

  // Update grid rotation when changed
  React.useEffect(() => {
    if (!grid?.three?.rotation || !initialized) return

    const currentRotationDegrees = (grid.three.rotation.y * 180) / Math.PI
    if (Math.abs(currentRotationDegrees - rotationY[0]) > 0.001) { // Use small tolerance for floating point comparison
      grid.three.rotation.y = (rotationY[0] * Math.PI) / 180
      bimDispatch({
        type: 'SET_GRID',
        payload: { grid },
      })
    }
  }, [rotationY, grid, initialized, bimDispatch])

  return (
    <CollapsibleSection
      title={t('gridTitle')}
      chevronPosition="left"
      switchVariant={{
        checked: gridVisible,
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
