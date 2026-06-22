// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the heavy AuthPage shell (uses next/dynamic, AnimatedBackground, MapLibre, etc.)
vi.mock('./AuthPage', () => ({
  AuthPage: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-page">{children}</div>,
  useAuthTheme: () => 'dark',
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useParams: () => ({ instance: 'canada' }),
}))
vi.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }))
vi.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img alt="" {...props} /> }))

// The ui barrel transitively imports MapLibre (via Sidebar → TopNavigationBar
// → Geocoder) and the store (which uses next-auth/react). Stub just the parts
// Signup needs.
vi.mock('../ui', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  Input: (props: any) => <input {...props} />,
}))
vi.mock('./PasswordError', () => ({
  PasswordError: ({ message }: { message?: string }) =>
    message ? <div data-testid="password-error">{message}</div> : null,
}))

import { SignUp } from './Signup'

function submitButton() {
  return document.querySelector('button[type="submit"]')!
}

describe('SignUp', () => {
  it('renders the four input fields', () => {
    render(<SignUp />)
    expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument()
  })

  function fillRequired() {
    // firstName has placeholder via t('placeholder1'); the others are hardcoded.
    fireEvent.change(screen.getByPlaceholderText('placeholder1'), { target: { value: 'Vu' } })
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Nguyen' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
  }

  it('flags a short password on submit', () => {
    render(<SignUp />)
    fillRequired()
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'short' } })
    fireEvent.submit(submitButton().closest('form')!)
    expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument()
  })

  it('flags a password mismatch on submit', () => {
    render(<SignUp />)
    fillRequired()
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'AReallyLongPassword1' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'DifferentPassword99' } })
    fireEvent.submit(submitButton().closest('form')!)
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
  })
})
