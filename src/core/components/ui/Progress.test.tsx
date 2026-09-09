// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Progress } from './Progress'

describe('Progress', () => {
  it('offsets the indicator by the remaining percentage', () => {
    const { container } = render(<Progress value={42} />)
    const indicator = container.querySelector('[data-slot="indicator"]') as HTMLElement
    expect(indicator.style.transform).toBe('translateX(-58%)')
  })

  it('marks a null value indeterminate and reports no value', () => {
    const { container } = render(<Progress value={null} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.dataset.indeterminate).toBe('true')
    expect(root.getAttribute('aria-valuenow')).toBeNull()
  })

  it('is determinate at zero rather than indeterminate', () => {
    const { container } = render(<Progress value={0} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.dataset.indeterminate).toBeUndefined()
  })
})
