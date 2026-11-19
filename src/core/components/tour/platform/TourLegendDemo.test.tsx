// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { showTourDemo } from './tourDemos'
import { TourLegendDemo } from './TourLegendDemo'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

describe('TourLegendDemo', () => {
  it('shows the example legend only while the tour asks for it', () => {
    render(<TourLegendDemo />)
    expect(screen.queryByText('title')).not.toBeInTheDocument()

    let hide = () => {}
    act(() => { hide = showTourDemo('legend') })
    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('age.before1950')).toBeInTheDocument()

    act(() => hide())
    expect(screen.queryByText('title')).not.toBeInTheDocument()
  })
})
