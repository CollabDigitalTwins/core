// @vitest-environment jsdom
import * as React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('./AuthPage', () => ({
  AuthPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuthTheme: () => 'dark',
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }))
vi.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img alt="" {...props} /> }))

vi.mock('../ui', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  Input: (props: any) => <input {...props} />,
}))
vi.mock('./PasswordError', () => ({
  PasswordError: ({ message }: { message?: string }) =>
    message ? <div data-testid="password-error">{message}</div> : null,
}))

import { ForgotPassword } from './ForgotPassword'

describe('ForgotPassword', () => {
  it('renders without crashing and shows two password fields', () => {
    render(<ForgotPassword />)
    const inputs = screen.getAllByPlaceholderText(/placeholder/i)
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('shows the length error after submitting a short password', () => {
    render(<ForgotPassword />)
    const [pw, confirm] = screen.getAllByPlaceholderText(/placeholder/i)
    fireEvent.change(pw, { target: { value: 'short' } })
    fireEvent.change(confirm, { target: { value: 'short' } })

    const submit = screen.getAllByRole('button').find(b => b.getAttribute('type') === 'submit')
      ?? screen.getAllByRole('button')[0]
    fireEvent.click(submit)

    expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument()
  })

  it('shows the mismatch error when passwords differ', () => {
    render(<ForgotPassword />)
    const [pw, confirm] = screen.getAllByPlaceholderText(/placeholder/i)
    fireEvent.change(pw, { target: { value: 'AValidPassword123' } })
    fireEvent.change(confirm, { target: { value: 'AnotherPassword456' } })

    const submit = screen.getAllByRole('button').find(b => b.getAttribute('type') === 'submit')
      ?? screen.getAllByRole('button')[0]
    fireEvent.click(submit)

    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
  })
})
