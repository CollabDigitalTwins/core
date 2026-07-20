// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))

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
})

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
})
