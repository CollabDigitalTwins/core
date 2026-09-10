// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CollapsibleSection } from './CollapsibleSection'

function header() {
  return screen.getByRole('button', { name: /Models/ })
}

describe('CollapsibleSection', () => {
  it('gives the header a keyboard-reachable button role', () => {
    render(<CollapsibleSection title="Models">body</CollapsibleSection>)
    expect(header()).toHaveAttribute('tabindex', '0')
  })

  it('toggles on Enter from the keyboard', () => {
    render(<CollapsibleSection title="Models">body</CollapsibleSection>)
    fireEvent.keyDown(header(), { key: 'Enter' })
    expect(screen.queryByText('body')).toBeNull()
  })

  it('sends header pointer events to the drag handlers', () => {
    const onPointerDown = vi.fn()
    render(
      <CollapsibleSection title="Models" dragHandleProps={{ onPointerDown }}>
        body
      </CollapsibleSection>,
    )
    fireEvent.pointerDown(header())
    expect(onPointerDown).toHaveBeenCalled()
  })

  it('marks the header while its section is being reordered', () => {
    render(
      <CollapsibleSection title="Models" isReordering>body</CollapsibleSection>,
    )
    expect(header()).toHaveAttribute('data-reordering', 'true')
  })

  it('leaves the header unmarked when it is not being reordered', () => {
    render(<CollapsibleSection title="Models">body</CollapsibleSection>)
    expect(header()).not.toHaveAttribute('data-reordering')
  })

  it('does not toggle on a click the drag handler has swallowed', () => {
    render(
      <CollapsibleSection
        title="Models"
        dragHandleProps={{ onClick: e => e.preventDefault() }}
      >
        body
      </CollapsibleSection>,
    )
    fireEvent.click(header())
    expect(screen.getByText('body')).toBeTruthy()
  })

  it('still toggles on a click the drag handler lets through', () => {
    render(
      <CollapsibleSection title="Models" dragHandleProps={{ onClick: () => {} }}>
        body
      </CollapsibleSection>,
    )
    fireEvent.click(header())
    expect(screen.queryByText('body')).toBeNull()
  })
})
