// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

import { MapPlacementMenu } from './MapPlacementMenu'

import type { DbFile } from '../../../../../types/dbTypes'

const modelFile = { id: 1, name: 'tower.glb', extension: 'glb' } as DbFile
const documentFile = { id: 2, name: 'plan.pdf', extension: 'pdf' } as DbFile
const pointCloudFile = { id: 3, name: 'scan.las', extension: 'las' } as DbFile

function renderMenu(file: DbFile, is3D: boolean, isOnMap = false) {
  render(
    <MapPlacementMenu
      x={0}
      y={0}
      file={file}
      is3D={is3D}
      isOnMap={isOnMap}
      onAction={vi.fn()}
      onClose={vi.fn()}
    />,
  )
}

describe('MapPlacementMenu', () => {
  it('offers move, rotate and scale for a 3D file', () => {
    renderMenu(modelFile, true)

    expect(screen.getByText('Move')).toBeTruthy()
    expect(screen.getByText('Rotate')).toBeTruthy()
    expect(screen.getByText('Scale')).toBeTruthy()
  })

  it('offers only move for a non-3D file, which has no gizmo to rotate or scale with', () => {
    renderMenu(documentFile, false)

    expect(screen.getByText('Move')).toBeTruthy()
    expect(screen.queryByText('Rotate')).toBeNull()
    expect(screen.queryByText('Scale')).toBeNull()
  })

  it('does not narrow a point cloud, whose capabilities carry no moveOnly flag', () => {
    renderMenu(pointCloudFile, true)

    expect(screen.getByText('Move')).toBeTruthy()
    expect(screen.getByText('Rotate')).toBeTruthy()
    expect(screen.getByText('Scale')).toBeTruthy()
  })

  it('reads the hide label when the file is on the map', () => {
    renderMenu(modelFile, true, true)

    expect(screen.getByText('hideTitle')).toBeTruthy()
    expect(screen.queryByText('showTitle')).toBeNull()
  })

  it('reads the show label when the file is not on the map', () => {
    renderMenu(modelFile, true, false)

    expect(screen.getByText('showTitle')).toBeTruthy()
    expect(screen.queryByText('hideTitle')).toBeNull()
  })

  it('renders exactly one delete row', () => {
    renderMenu(modelFile, true)

    expect(screen.getAllByText('deleteTitle')).toHaveLength(1)
  })
})
