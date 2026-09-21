// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../../../ui/FilesManager/src/uploadProgress', () => ({
  useUploadTasks: () => [{ id: '1', name: 'tower.glb', progress: 40 }],
}))

import MapFileMarker from './MapFileMarker'

const ring = (container: HTMLElement) => container.querySelector('svg[viewBox="0 0 40 40"]')

describe('MapFileMarker', () => {
  it('draws the upload ring around the pin, the size the BIM viewer draws it', () => {
    const { container } = render(<MapFileMarker mimeType="model/gltf-binary" extension="glb" fileName="tower.glb" />)

    expect(ring(container)?.getAttribute('class')).toContain('h-[42px]')
  })

  it('keeps the pin outlined while it uploads, so the ring is a ring and not the rim', () => {
    const { container } = render(<MapFileMarker mimeType="model/gltf-binary" extension="glb" fileName="tower.glb" />)

    expect(container.querySelector('button')?.className).not.toContain('border-0')
  })

  it('draws no ring when nothing is uploading', () => {
    const { container } = render(<MapFileMarker mimeType="model/gltf-binary" extension="glb" />)

    expect(ring(container)).toBeNull()
  })
})
