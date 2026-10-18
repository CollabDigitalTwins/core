// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LabelledSelect } from './LabelledSelect'

const options = [{ value: 'quantile', label: 'Quantile' }, { value: 'jenks', label: 'Natural breaks' }]

describe('LabelledSelect', () => {
  it('names the trigger after its caption and shows the selected option', () => {
    render(<LabelledSelect label="Method" value="jenks" options={options} onChange={vi.fn()} />)
    expect(screen.getByText('Method')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Method' }).textContent).toBe('Natural breaks')
  })

  it('merges a caller className onto the wrapper', () => {
    render(<LabelledSelect label="Method" value="jenks" options={options} onChange={vi.fn()} className="flex-none" />)
    const wrapper = screen.getByText('Method').closest('label')
    expect(wrapper?.className).toContain('flex-none')
    expect(wrapper?.className).not.toContain('flex-1')
  })
})
