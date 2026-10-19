// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'

const { createMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: toastErrorMock, success: toastSuccessMock } }))

vi.mock('../../../ui/Dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}))
vi.mock('../../../ui/Button', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}))
vi.mock('../../../ui/Input', () => ({
  Input: (props: any) => <input {...props} />,
}))
vi.mock('../../../ui/Label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}))
vi.mock('../../../../hooks/openDataPortals/openDataPortals', () => ({
  useCreateOpenDataPortal: () => ({
    createOpenDataPortal: (...args: unknown[]) => createMock(...args),
    isMutating: false,
  }),
}))

import { AddPortalDialog } from './AddPortalDialog'

beforeEach(() => {
  createMock.mockReset().mockResolvedValue(undefined)
  toastErrorMock.mockReset()
  toastSuccessMock.mockReset()
})

async function submitCkanPortal(apiUrl: string) {
  fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: 'Données Québec' } })
  fireEvent.change(screen.getByLabelText('Data Management System'), { target: { value: 'Ckan' } })
  fireEvent.change(screen.getByLabelText('API URL'), { target: { value: apiUrl } })
  await act(async () => {
    fireEvent.submit(screen.getByText('Add Portal').closest('form')!)
  })
}

describe('AddPortalDialog', () => {
  it('does not render when open is false', () => {
    render(<AddPortalDialog open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('renders the form when open', () => {
    render(<AddPortalDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Add Open Data Portal')).toBeInTheDocument()
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
  })

  it('shows "Name is required" when submitting with an empty name', async () => {
    render(<AddPortalDialog open={true} onOpenChange={vi.fn()} />)

    // Bypass the HTML5 `required` check by submitting the form directly.
    const form = screen.getByText('Add Portal').closest('form')!
    await act(async () => {
      fireEvent.submit(form)
    })

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('strips empty optional fields before submission', async () => {
    const onOpenChange = vi.fn()
    render(<AddPortalDialog open={true} onOpenChange={onOpenChange} />)

    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: '  My Portal  ' } })
    fireEvent.change(screen.getByLabelText('Portal URL'), { target: { value: '   ' } })

    await act(async () => {
      fireEvent.submit(screen.getByText('Add Portal').closest('form')!)
    })

    expect(createMock).toHaveBeenCalledTimes(1)
    const payload = createMock.mock.calls[0][0]
    expect(payload.name).toBe('My Portal')          // trimmed
    expect(payload.portalUrl).toBeUndefined()        // empty-string stripped to undefined
    expect(payload.dataManagementSystem).toBeUndefined()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('surfaces an error message when createOpenDataPortal rejects', async () => {
    createMock.mockRejectedValue(new Error('upstream blew up'))
    render(<AddPortalDialog open={true} onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: 'My Portal' } })

    await act(async () => {
      fireEvent.submit(screen.getByText('Add Portal').closest('form')!)
    })

    expect(screen.getByText('upstream blew up')).toBeInTheDocument()
  })

  it('Cancel button calls onOpenChange(false)', () => {
    const onOpenChange = vi.fn()
    render(<AddPortalDialog open={true} onOpenChange={onOpenChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('requires an API URL for a system core lists datasets from', async () => {
    render(<AddPortalDialog open={true} onOpenChange={vi.fn()} />)

    await submitCkanPortal('')

    expect(screen.getByText('An API URL is required for Ckan portals')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('refuses a malformed URL before calling the server', async () => {
    render(<AddPortalDialog open={true} onOpenChange={vi.fn()} />)

    await submitCkanPortal('https://exa mple.org')

    expect(screen.getByText('API URL is not a valid URL')).toBeInTheDocument()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('toasts a duplicate and keeps the dialog open', async () => {
    createMock.mockRejectedValue(new Error(
      'API error 409: {"error":"\\"Données Québec\\" is already registered","code":"DUPLICATE_PORTAL","existingName":"Données Québec"}',
    ))
    const onOpenChange = vi.fn()
    render(<AddPortalDialog open={true} onOpenChange={onOpenChange} />)

    await submitCkanPortal('https://www.donneesquebec.ca/recherche')

    expect(toastErrorMock).toHaveBeenCalledWith('Données Québec is already registered', expect.anything())
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('explains why an API that failed the server check cannot be used', async () => {
    createMock.mockRejectedValue(new Error(
      'API error 422: {"error":"The API answered with HTTP 404","code":"PORTAL_UNREACHABLE"}',
    ))
    render(<AddPortalDialog open={true} onOpenChange={vi.fn()} />)

    await submitCkanPortal('https://www.donneesquebec.ca/recherche')

    expect(screen.getByText("This API can't be used: The API answered with HTTP 404")).toBeInTheDocument()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('confirms a saved portal with a toast', async () => {
    render(<AddPortalDialog open={true} onOpenChange={vi.fn()} />)

    await submitCkanPortal('https://www.donneesquebec.ca/recherche')

    expect(toastSuccessMock).toHaveBeenCalledWith('Données Québec is now available to your organization')
  })
})
