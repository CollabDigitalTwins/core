// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { UploadProgressBar } from './UploadProgressBar'

describe('UploadProgressBar', () => {
  it('shows the label and the rounded percentage', () => {
    render(<UploadProgressBar label="Uploading scan" progress={42.4} />)
    expect(screen.getByText('Uploading scan')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('shows 0% rather than nothing at the start', () => {
    render(<UploadProgressBar label="Uploading scan" progress={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('shows 100% at the end', () => {
    render(<UploadProgressBar label="Uploading scan" progress={100} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('omits the percentage when progress is indeterminate', () => {
    const { container } = render(<UploadProgressBar label="Finishing scan" progress={null} />)
    expect(screen.getByText('Finishing scan')).toBeInTheDocument()
    expect(container.textContent).not.toContain('%')
  })
})
