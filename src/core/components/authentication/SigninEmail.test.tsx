// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img alt={props.alt || ''} {...props} />,
}))

import { SigninEmail } from './SigninEmail'

// SigninEmail is a server-rendered email template (like VerifyEmail), not an
// interactive form. The tests below verify the only thing that can actually
// break: the URL must be rendered as a real link.
describe('SigninEmail', () => {
  it('renders the sign-in link with the provided URL', () => {
    render(<SigninEmail url="https://example.com/auth" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com/auth')
  })

  it('shows the platform welcome heading', () => {
    render(<SigninEmail url="https://x.com" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Welcome to the Digital Twin Platform/i)
  })

  it('includes the CDT logo image', () => {
    render(<SigninEmail url="https://x.com" />)
    expect(screen.getByAltText('CDT logo')).toBeInTheDocument()
  })
})
