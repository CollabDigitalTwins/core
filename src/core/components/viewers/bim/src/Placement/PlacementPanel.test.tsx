// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_PLACEMENT } from '../../../shared/pointcloud/pointCloudPlacement'

import { PlacementPanel } from './PlacementPanel'
import { FULL_PLACEMENT, SCALABLE_OBJECT_PLACEMENT, YAW_ONLY_PLACEMENT } from './placementTarget'

import type { PlacementMode } from './PlacementEditor'
import type { PlacementCapabilities } from './placementTarget'
import type { PointCloudPlacement } from '../../../shared/pointcloud/pointCloudPlacement'

const LABELS = {
  title: 'Place', position: 'Position', rotation: 'Rotation', scale: 'Scale', yaw: 'Rotation',
  translate: 'Move', rotate: 'Rotate', reset: 'Reset', done: 'Done', centre: 'Centre on scene origin',
  pickPivot: 'Pick centre point', pivotSet: 'Turning about the picked point',
  pivotOrigin: 'Reset to origin',
}

function renderPanel(
  capabilities: PlacementCapabilities,
  placement: PointCloudPlacement = { ...DEFAULT_PLACEMENT },
  mode: PlacementMode = 'translate',
  hasPivot = false,
) {
  const handlers = {
    onPlacementChange: vi.fn(),
    onModeChange: vi.fn(),
    onCentre: vi.fn(),
    onPickPivot: vi.fn(),
    onClearPivot: vi.fn(),
  }
  render(
    <PlacementPanel
      name="tower.frag"
      capabilities={capabilities}
      placement={placement}
      mode={mode}
      labels={LABELS}
      hasPivot={hasPivot}
      onDone={vi.fn()}
      onReset={vi.fn()}
      {...handlers}
    />,
  )
  return handlers
}

const modeButtons = () => screen.getAllByRole('button')
  .map((button) => button.getAttribute('title'))
  .filter((title): title is string => Boolean(title))

describe('PlacementPanel mode gating', () => {
  it('offers scale for a target that can save one', () => {
    renderPanel(FULL_PLACEMENT)

    expect(modeButtons().some((title) => title.startsWith('Scale'))).toBe(true)
  })

  it('hides scale for a target that cannot save one', () => {
    renderPanel(YAW_ONLY_PLACEMENT)

    expect(modeButtons().some((title) => title.startsWith('Scale'))).toBe(false)
  })

  it('always offers move and rotate', () => {
    renderPanel(YAW_ONLY_PLACEMENT)

    expect(modeButtons().some((title) => title.startsWith('Move'))).toBe(true)
    expect(modeButtons().some((title) => title.startsWith('Rotate'))).toBe(true)
  })
})

describe('PlacementPanel rotation gating', () => {
  it('shows three axes for a target that can save a full rotation', () => {
    renderPanel(FULL_PLACEMENT, { ...DEFAULT_PLACEMENT }, 'rotate')

    expect(screen.getByLabelText('Rotation X')).toBeTruthy()
    expect(screen.getByLabelText('Rotation Y')).toBeTruthy()
    expect(screen.getByLabelText('Rotation Z')).toBeTruthy()
  })

  it('shows one yaw field for a target that can only save yaw', () => {
    renderPanel(YAW_ONLY_PLACEMENT, { ...DEFAULT_PLACEMENT }, 'rotate')

    expect(screen.queryByLabelText('Rotation X')).toBeNull()
    expect(screen.queryByLabelText('Rotation Z')).toBeNull()
    expect(screen.getByLabelText('Rotation')).toBeTruthy()
  })

  it('shows the yaw it already has, in degrees', () => {
    const placement = { ...DEFAULT_PLACEMENT, rotation: [0, Math.PI / 2, 0] as [number, number, number] }
    renderPanel(YAW_ONLY_PLACEMENT, placement, 'rotate')

    expect(screen.getByLabelText('Rotation')).toHaveValue(90)
  })

  it('sends a yaw edit back in radians, leaving pitch and roll alone', () => {
    const { onPlacementChange } = renderPanel(YAW_ONLY_PLACEMENT, { ...DEFAULT_PLACEMENT }, 'rotate')

    fireEvent.change(screen.getByLabelText('Rotation'), { target: { value: '180' } })

    expect(onPlacementChange).toHaveBeenCalledWith(
      expect.objectContaining({ rotation: [0, Math.PI, 0] }),
    )
  })
})

describe('PlacementPanel shared controls', () => {
  it('offers the pivot on a yaw-only target too', () => {
    const { onPickPivot } = renderPanel(YAW_ONLY_PLACEMENT, { ...DEFAULT_PLACEMENT }, 'rotate')

    fireEvent.click(screen.getByText('Pick centre point'))

    expect(onPickPivot).toHaveBeenCalled()
  })

  it('offers centre-on-origin on a yaw-only target too', () => {
    const { onCentre } = renderPanel(YAW_ONLY_PLACEMENT)

    fireEvent.click(screen.getByText('Centre on scene origin'))

    expect(onCentre).toHaveBeenCalled()
  })

  it('names the target being placed', () => {
    renderPanel(YAW_ONLY_PLACEMENT)

    expect(screen.getByText('tower.frag')).toBeTruthy()
  })
})

describe('PlacementPanel scale field', () => {
  it('offers one number, never a value per axis', () => {
    renderPanel(FULL_PLACEMENT, { ...DEFAULT_PLACEMENT }, 'scale')

    expect(screen.getByLabelText('Scale')).toBeTruthy()
    expect(screen.queryByLabelText('Scale X')).toBeNull()
    expect(screen.queryByLabelText('Scale Y')).toBeNull()
  })

  it('steps finely enough to edit a DXF sitting at its millimetre conversion', () => {
    const dxf = { ...DEFAULT_PLACEMENT, scale: 0.001 }
    renderPanel(SCALABLE_OBJECT_PLACEMENT, dxf, 'scale')

    expect(screen.getByLabelText('Scale')).toHaveAttribute('step', '0.001')
  })

  it('steps normally at everyday scales', () => {
    renderPanel(SCALABLE_OBJECT_PLACEMENT, { ...DEFAULT_PLACEMENT }, 'scale')

    expect(screen.getByLabelText('Scale')).toHaveAttribute('step', '0.01')
  })
})

describe('PlacementPanel while placing a new file', () => {
  function renderPlacing() {
    const handlers = { onPickPivot: vi.fn(), onCentre: vi.fn() }
    render(
      <PlacementPanel
        name="plan.dxf"
        capabilities={SCALABLE_OBJECT_PLACEMENT}
        availableModes={['rotate', 'scale']}
        allowPivot={false}
        placement={{ ...DEFAULT_PLACEMENT }}
        mode="scale"
        labels={LABELS}
        hint="Double-click in the scene to place."
        hasPivot={false}
        onModeChange={vi.fn()}
        onPlacementChange={vi.fn()}
        onClearPivot={vi.fn()}
        onDone={vi.fn()}
        onReset={vi.fn()}
        {...handlers}
      />,
    )
    return handlers
  }

  it('shows the instruction it was given', () => {
    renderPlacing()

    expect(screen.getByText('Double-click in the scene to place.')).toBeTruthy()
  })

  it('offers no move mode, because the double-click sets the position', () => {
    renderPlacing()

    expect(modeButtons().some((title) => title.startsWith('Move'))).toBe(false)
  })

  it('hides the pivot control, which has nothing to turn about yet', () => {
    renderPlacing()

    expect(screen.queryByText('Pick centre point')).toBeNull()
  })

  it('hides centre-on-origin too', () => {
    renderPlacing()

    expect(screen.queryByText('Centre on scene origin')).toBeNull()
  })

  it('still offers the unit presets, which is the point of the card', () => {
    renderPlacing()

    expect(screen.getByText('mm')).toBeTruthy()
    expect(screen.getByText('in')).toBeTruthy()
  })
})
