// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NumberField } from './NumberField'

function renderField(value = 2) {
  const onCommit = vi.fn()
  const view = render(<NumberField label="Scale" value={value} step={0.01} onCommit={onCommit} />)
  return { onCommit, view, field: () => screen.getByLabelText('Scale') as HTMLInputElement }
}

describe('NumberField', () => {
  it('shows the value it was given', () => {
    const { field } = renderField(2)

    expect(field().value).toBe('2')
  })

  it('lets the user clear it to start over, without committing', () => {
    const { field, onCommit } = renderField(2)

    fireEvent.change(field(), { target: { value: '' } })

    expect(field().value).toBe('')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('commits once a real number is typed', () => {
    const { field, onCommit } = renderField(2)

    fireEvent.change(field(), { target: { value: '' } })
    fireEvent.change(field(), { target: { value: '5' } })

    expect(onCommit).toHaveBeenCalledWith(5)
  })

  // A number input sanitises anything it cannot parse to '', so a half-typed value arrives empty.
  it('stays empty rather than snapping to a number while half-typed', () => {
    const { field, onCommit } = renderField(2)

    fireEvent.change(field(), { target: { value: '-' } })

    expect(field().value).toBe('')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('keeps the field usable after several invalid keystrokes', () => {
    const { field, onCommit } = renderField(2)

    fireEvent.change(field(), { target: { value: '' } })
    fireEvent.change(field(), { target: { value: '-' } })
    fireEvent.change(field(), { target: { value: '0.5' } })

    expect(onCommit).toHaveBeenCalledExactlyOnceWith(0.5)
  })

  it('goes back to the real value when the user leaves an empty field', () => {
    const { field } = renderField(2)
    fireEvent.change(field(), { target: { value: '' } })

    fireEvent.blur(field())

    expect(field().value).toBe('2')
  })

  it('follows the value from outside while the user is not typing', () => {
    const onCommit = vi.fn()
    const { rerender } = render(<NumberField label="Scale" value={1} step={1} onCommit={onCommit} />)

    rerender(<NumberField label="Scale" value={9} step={1} onCommit={onCommit} />)

    expect((screen.getByLabelText('Scale') as HTMLInputElement).value).toBe('9')
  })
})
