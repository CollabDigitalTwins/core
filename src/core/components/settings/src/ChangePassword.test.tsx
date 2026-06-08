// @vitest-environment jsdom
import * as React from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'

const { changePasswordMock, verifyPasswordMock, toastSuccess, toastError } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('../../../store', () => ({
  usePermissions: () => ({ ability: { can: () => true } }),
}))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: '7', email: 'alice@example.com' } } }),
}))
vi.mock('../../../hooks/users/users', () => ({
  useChangePassword: () => ({
    changePassword: changePasswordMock,
    isLoading: false,
    error: null,
    success: false,
  }),
  useVerifyPassword: () => ({
    verifyPassword: verifyPasswordMock,
    isLoading: false,
    error: null,
    isValid: false,
  }),
}))
vi.mock('../../ui/', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  Input: (props: any) => <input {...props} />,
}))
vi.mock('../../ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <span>…</span>,
}))
vi.mock('../../authentication/PasswordError', () => ({
  PasswordError: ({ message }: { message?: string }) =>
    message ? <div data-testid="password-error">{message}</div> : null,
}))
vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}))

import ChangePassword from './ChangePassword'

beforeEach(() => {
  changePasswordMock.mockReset().mockResolvedValue(undefined)
  verifyPasswordMock.mockReset()
  toastSuccess.mockReset()
  toastError.mockReset()
})

describe('ChangePassword', () => {
  it('returns null when isEditing is false', () => {
    const { container } = render(<ChangePassword isEditing={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the verify-current-password step when isEditing is true', () => {
    render(<ChangePassword isEditing={true} />)
    expect(screen.getByPlaceholderText('verifyPlaceholder')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'next' })).toBeInTheDocument()
  })

  it('disables "next" until the current password has at least 12 characters', () => {
    render(<ChangePassword isEditing={true} />)
    const input = screen.getByPlaceholderText('verifyPlaceholder')
    const button = screen.getByRole('button', { name: 'next' })

    fireEvent.change(input, { target: { value: 'short' } })
    expect(button).toBeDisabled()

    fireEvent.change(input, { target: { value: 'a-long-current-pw' } })
    expect(button).not.toBeDisabled()
  })

  it('advances to the new-password step when verifyPassword returns true', async () => {
    verifyPasswordMock.mockResolvedValue(true)
    render(<ChangePassword isEditing={true} />)

    fireEvent.change(screen.getByPlaceholderText('verifyPlaceholder'), {
      target: { value: 'currentPassword123' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'next' }))
    })

    expect(screen.getByPlaceholderText('New password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument()
  })

  it('stays on the verify step and toasts when verifyPassword returns false', async () => {
    verifyPasswordMock.mockResolvedValue(false)
    render(<ChangePassword isEditing={true} />)

    fireEvent.change(screen.getByPlaceholderText('verifyPlaceholder'), {
      target: { value: 'currentPassword123' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'next' }))
    })

    expect(toastError).toHaveBeenCalledWith('noMatch')
    expect(screen.queryByPlaceholderText('New password')).not.toBeInTheDocument()
  })

  it('flags a weak new password on save (fails regex) and does not call changePassword', async () => {
    verifyPasswordMock.mockResolvedValue(true)
    render(<ChangePassword isEditing={true} />)

    fireEvent.change(screen.getByPlaceholderText('verifyPlaceholder'), {
      target: { value: 'currentPassword123' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'next' }))
    })

    // Weak password (too short, no uppercase/digit/special).
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'weakpassword' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'weakpassword' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'save' }))
    })

    expect(screen.getAllByTestId('password-error').length).toBeGreaterThanOrEqual(1)
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('flags a password mismatch on save and does not call changePassword', async () => {
    verifyPasswordMock.mockResolvedValue(true)
    render(<ChangePassword isEditing={true} />)

    fireEvent.change(screen.getByPlaceholderText('verifyPlaceholder'), {
      target: { value: 'currentPassword123' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'next' }))
    })

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'StrongPassword#1' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'DifferentPassword#2' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'save' }))
    })

    expect(changePasswordMock).not.toHaveBeenCalled()
    expect(screen.getByText('noMatch')).toBeInTheDocument()
  })

  it('calls changePassword(current, new) when both passwords validate', async () => {
    verifyPasswordMock.mockResolvedValue(true)
    render(<ChangePassword isEditing={true} />)

    fireEvent.change(screen.getByPlaceholderText('verifyPlaceholder'), {
      target: { value: 'currentPassword123' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'next' }))
    })

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'StrongPassword#1' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'StrongPassword#1' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'save' }))
    })

    expect(changePasswordMock).toHaveBeenCalledWith('currentPassword123', 'StrongPassword#1')
  })
})
