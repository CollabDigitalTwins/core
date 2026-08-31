// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { useOptionListKeys } from './useOptionListKeys'

function Harness({ options }: { options: string[] }) {
  const { inputRef, optionRef, onInputKeyDown, onOptionKeyDown } = useOptionListKeys(options.length)
  return (
    <div>
      <input ref={inputRef} aria-label="search" onKeyDown={onInputKeyDown} />
      {options.map((option, index) => (
        <button key={option} ref={optionRef(index)} onKeyDown={onOptionKeyDown(index)}>{option}</button>
      ))}
    </div>
  )
}

const OPTIONS = ['Paterson', 'Nicol', 'Tory']

describe('useOptionListKeys', () => {
  it('moves from the input into the first option on ArrowDown', () => {
    render(<Harness options={OPTIONS} />)
    const input = screen.getByLabelText('search')
    input.focus()

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    expect(document.activeElement).toBe(screen.getByText('Paterson'))
  })

  it('walks down the list and stops at the last option', () => {
    render(<Harness options={OPTIONS} />)
    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'ArrowDown' })

    fireEvent.keyDown(screen.getByText('Paterson'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByText('Nicol'))

    fireEvent.keyDown(screen.getByText('Nicol'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByText('Tory'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByText('Tory'))
  })

  it('walks back up and returns to the input from the first option', () => {
    render(<Harness options={OPTIONS} />)
    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByText('Paterson'), { key: 'ArrowDown' })

    fireEvent.keyDown(screen.getByText('Nicol'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(screen.getByText('Paterson'))

    fireEvent.keyDown(screen.getByText('Paterson'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(screen.getByLabelText('search'))
  })

  it('returns to the input on Escape', () => {
    render(<Harness options={OPTIONS} />)
    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'ArrowDown' })

    fireEvent.keyDown(screen.getByText('Paterson'), { key: 'Escape' })

    expect(document.activeElement).toBe(screen.getByLabelText('search'))
  })

  it('does nothing on ArrowDown when there is nothing to move to', () => {
    render(<Harness options={[]} />)
    const input = screen.getByLabelText('search')
    input.focus()

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    expect(document.activeElement).toBe(input)
  })

  it('leaves other keys alone so typing still reaches the input', () => {
    render(<Harness options={OPTIONS} />)
    const input = screen.getByLabelText('search')
    input.focus()

    fireEvent.keyDown(input, { key: 'a' })

    expect(document.activeElement).toBe(input)
  })
})
