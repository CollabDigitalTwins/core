// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import FileIcon from './FileIcon'

describe('FileIcon', () => {
  it('shows an image file as itself when there is something to show', () => {
    const { container } = render(<FileIcon mimeType="image/png" url="https://example.test/a.png" />)

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.test/a.png')
  })

  it('draws the icon instead when the image has no url yet', () => {
    const { container } = render(<FileIcon mimeType="image/png" size={18} />)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('draws the kinds it never knew before, now that one rule answers for both', () => {
    const { container } = render(<FileIcon mimeType="" extension="ids" size={18} />)

    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('passes the size through to the icon', () => {
    const { container } = render(<FileIcon mimeType="" extension="pdf" size={22} />)

    expect(container.querySelector('svg')?.getAttribute('width')).toBe('22')
  })
})
