// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fireEvent, render, screen } from '@testing-library/react'
import * as LR from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { PlacementActionsCard } from './PlacementActionsCard'

describe('PlacementActionsCard', () => {
  it('offers view and download only when they are listed', () => {
    render(
      <PlacementActionsCard
        name="tower.glb"
        Icon={LR.Box}
        actions={['move', 'view', 'download']}
        labels={{ view: 'Open', download: 'Save a copy' }}
      />,
    )

    expect(screen.getByText('Open')).toBeTruthy()
    expect(screen.getByText('Save a copy')).toBeTruthy()
    expect(screen.queryByText('Rotate')).toBeNull()
  })

  it('leaves them out for a caller that does not list them', () => {
    render(<PlacementActionsCard name="tower.glb" Icon={LR.Box} actions={['move', 'rotate']} />)

    expect(screen.queryByText('Open')).toBeNull()
    expect(screen.getByText('Move')).toBeTruthy()
  })

  it('reports the action it was clicked for', async () => {
    const onAction = vi.fn()
    render(
      <PlacementActionsCard
        name="tower.glb"
        Icon={LR.Box}
        actions={['view']}
        labels={{ view: 'Open' }}
        onAction={onAction}
      />,
    )

    fireEvent.pointerDown(screen.getByText('Open'))
    expect(onAction).toHaveBeenCalledWith('view')
  })
})
