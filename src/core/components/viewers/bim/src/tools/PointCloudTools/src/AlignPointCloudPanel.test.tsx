// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_PLACEMENT } from '../../../../../shared/pointcloud/pointCloudPlacement'

import { AlignPointCloudPanel } from './AlignPointCloudPanel'

import type { PointCloudPlacement } from '../../../../../shared/pointcloud/pointCloudPlacement'
import type { AlignmentMode } from '../../../PointClouds/PointCloudAlignment'

const LABELS = {
  title: 'Align', position: 'Position', rotation: 'Rotation', scale: 'Scale',
  translate: 'Move', rotate: 'Rotate', reset: 'Reset', done: 'Done', centre: 'Centre on scene origin',
  pickPivot: 'Pick centre point', pivotSet: 'Turning about the picked point',
  pivotOrigin: 'Reset to cloud origin',
}

function renderPanel(
  placement: PointCloudPlacement,
  mode: AlignmentMode = 'translate',
  hasPivot = false,
) {
  const onPlacementChange = vi.fn()
  const onModeChange = vi.fn()
  const onCentre = vi.fn()
  const onPickPivot = vi.fn()
  const onClearPivot = vi.fn()
  render(
    <AlignPointCloudPanel
      name="scan"
      placement={placement}
      mode={mode}
      labels={LABELS}
      onModeChange={onModeChange}
      onPlacementChange={onPlacementChange}
      onCentre={onCentre}
      onPickPivot={onPickPivot}
      onClearPivot={onClearPivot}
      hasPivot={hasPivot}
      onDone={vi.fn()}
      onReset={vi.fn()}
    />,
  )
  return { onPlacementChange, onModeChange, onCentre, onPickPivot, onClearPivot }
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
    const { onPlacementChange } = renderPanel({ ...DEFAULT_PLACEMENT, rotation: [0, 0, 0] }, 'rotate')

    fireEvent.change(screen.getByLabelText('Rotation Z'), { target: { value: '90' } })

    const next = onPlacementChange.mock.calls[0][0] as PointCloudPlacement
    expect(next.rotation[1]).toBeCloseTo(Math.PI / 2)
    expect(next.rotation[2]).toBe(0)
  })
})

describe('AlignPointCloudPanel modes', () => {
  it('shows only the position inputs while moving', () => {
    renderPanel(DEFAULT_PLACEMENT, 'translate')

    expect(screen.getByLabelText('Position X')).toBeInTheDocument()
    expect(screen.queryByLabelText('Rotation X')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Scale')).not.toBeInTheDocument()
  })

  it('shows only the rotation inputs while rotating', () => {
    renderPanel(DEFAULT_PLACEMENT, 'rotate')

    expect(screen.getByLabelText('Rotation X')).toBeInTheDocument()
    expect(screen.queryByLabelText('Position X')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Scale')).not.toBeInTheDocument()
  })

  it('shows only the scale input while scaling', () => {
    renderPanel(DEFAULT_PLACEMENT, 'scale')

    expect(screen.getByLabelText('Scale')).toBeInTheDocument()
    expect(screen.queryByLabelText('Position X')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Rotation X')).not.toBeInTheDocument()
  })

  it('keeps every mode reachable, so switching is one click from anywhere', () => {
    const { onModeChange } = renderPanel(DEFAULT_PLACEMENT, 'scale')

    fireEvent.click(screen.getByTitle('Move (G)'))

    expect(onModeChange).toHaveBeenCalledWith('translate')
  })

  it('still edits scale when that is the live mode', () => {
    const { onPlacementChange } = renderPanel({ ...DEFAULT_PLACEMENT, scale: 1 }, 'scale')

    fireEvent.change(screen.getByLabelText('Scale'), { target: { value: '2.5' } })

    expect(onPlacementChange).toHaveBeenCalledWith(expect.objectContaining({ scale: 2.5 }))
  })
})

describe('AlignPointCloudPanel centring', () => {
  it('offers centring beside the position inputs, where a lost cloud is dealt with', () => {
    const { onCentre } = renderPanel(DEFAULT_PLACEMENT, 'translate')

    fireEvent.click(screen.getByRole('button', { name: /Centre on scene origin/ }))

    expect(onCentre).toHaveBeenCalledTimes(1)
  })

  it('is absent in the other modes, which are not about position', () => {
    renderPanel(DEFAULT_PLACEMENT, 'rotate')

    expect(screen.queryByRole('button', { name: /Centre on scene origin/ })).not.toBeInTheDocument()
  })
})

describe('AlignPointCloudPanel pivot', () => {
  const pickButton = () => screen.queryByRole('button', { name: /Pick centre point/ })

  it('offers a centre point in rotate mode, where turning about the wrong point hurts', () => {
    const { onPickPivot } = renderPanel(DEFAULT_PLACEMENT, 'rotate')

    fireEvent.click(pickButton() as HTMLElement)

    expect(onPickPivot).toHaveBeenCalledTimes(1)
  })

  it('offers it in scale mode too', () => {
    renderPanel(DEFAULT_PLACEMENT, 'scale')

    expect(pickButton()).toBeInTheDocument()
  })

  it('offers it in move mode too, so the pivot can be set from any mode', () => {
    const { onPickPivot } = renderPanel(DEFAULT_PLACEMENT, 'translate')

    fireEvent.click(pickButton() as HTMLElement)

    expect(onPickPivot).toHaveBeenCalledTimes(1)
  })

  it('keeps centring and picking apart in move mode, where both are offered', () => {
    const { onCentre, onPickPivot } = renderPanel(DEFAULT_PLACEMENT, 'translate')

    fireEvent.click(screen.getByRole('button', { name: /Centre on scene origin/ }))

    expect(onCentre).toHaveBeenCalledTimes(1)
    expect(onPickPivot).not.toHaveBeenCalled()
  })

  it('says nothing about a pivot until one is picked', () => {
    renderPanel(DEFAULT_PLACEMENT, 'rotate', false)

    expect(screen.queryByText('Turning about the picked point')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reset to cloud origin/ })).not.toBeInTheDocument()
  })

  it('shows a picked pivot and offers the way back to the cloud origin', () => {
    const { onClearPivot } = renderPanel(DEFAULT_PLACEMENT, 'rotate', true)

    expect(screen.getByText('Turning about the picked point')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Reset to cloud origin/ }))

    expect(onClearPivot).toHaveBeenCalledTimes(1)
  })
})
