// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it } from 'vitest'

import { MenuPathText } from './MenuPathText'

const labels = { support: 'Support', guide: 'Guide' }

describe('MenuPathText', () => {
  it('shows the menu tokens as their labels, each with an icon', () => {
    const { container } = render(<MenuPathText text="Open it from @support → @guide." labels={labels} />)
    expect(screen.getByText(/Open it from/)).toHaveTextContent('Open it from Support → Guide.')
    expect(container.querySelectorAll('.cdt-tour-menu-path svg')).toHaveLength(2)
  })

  it('leaves unknown tokens as written and splits lines into paragraphs', () => {
    const { container } = render(<MenuPathText text={'Email @team\nSecond line'} labels={labels} />)
    expect(container.querySelectorAll('p')).toHaveLength(2)
    expect(screen.getByText('Email @team')).toBeInTheDocument()
  })
})
