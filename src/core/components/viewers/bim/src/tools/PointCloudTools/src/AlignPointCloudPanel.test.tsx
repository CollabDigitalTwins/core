// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_PLACEMENT } from '../../../../../shared/pointcloud/pointCloudPlacement'

import { AlignPointCloudPanel } from './AlignPointCloudPanel'

import type { PointCloudPlacement } from '../../../../../shared/pointcloud/pointCloudPlacement'

const LABELS = {
  title: 'Align', position: 'Position', rotation: 'Rotation', scale: 'Scale',
  translate: 'Move', rotate: 'Rotate', reset: 'Reset', done: 'Done',
}

function renderPanel(placement: PointCloudPlacement) {
  const onPlacementChange = vi.fn()
  render(
    <AlignPointCloudPanel
      name="scan"
      placement={placement}
      mode="translate"
      labels={LABELS}
      onModeChange={vi.fn()}
      onPlacementChange={onPlacementChange}
      onDone={vi.fn()}
      onReset={vi.fn()}
    />,
  )
  return { onPlacementChange }
}

describe('AlignPointCloudPanel axes', () => {
  it('shows the scene up axis under Z, the way BIM authoring tools label it', () => {
    renderPanel({ ...DEFAULT_PLACEMENT, position: [1, 9, 3] })

    expect(screen.getByLabelText('Position Z')).toHaveValue(9)
    expect(screen.getByLabelText('Position Y')).toHaveValue(3)
    expect(screen.getByLabelText('Position X')).toHaveValue(1)
  })

  it('moves the cloud up when Z is edited', () => {
    const { onPlacementChange } = renderPanel({ ...DEFAULT_PLACEMENT, position: [0, 0, 0] })

    fireEvent.change(screen.getByLabelText('Position Z'), { target: { value: '5' } })

    expect(onPlacementChange).toHaveBeenCalledWith(expect.objectContaining({ position: [0, 5, 0] }))
  })

  it('uses the same axis order for rotation', () => {
    const { onPlacementChange } = renderPanel({ ...DEFAULT_PLACEMENT, rotation: [0, 0, 0] })

    fireEvent.change(screen.getByLabelText('Rotation Z'), { target: { value: '90' } })

    const next = onPlacementChange.mock.calls[0][0] as PointCloudPlacement
    expect(next.rotation[1]).toBeCloseTo(Math.PI / 2)
    expect(next.rotation[2]).toBe(0)
  })
})
