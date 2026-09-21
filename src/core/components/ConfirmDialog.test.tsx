// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

import ConfirmDialog from './ConfirmDialog'

const open = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) =>
  render(
    <ConfirmDialog
      isOpen
      isDeleting={false}
      onOpenChange={vi.fn()}
      handleConfirm={vi.fn()}
      itemName="tower.frag"
      {...props}
    />,
  )

describe('ConfirmDialog', () => {
  it('asks about a delete when the caller supplies no copy of its own', () => {
    open()

    expect(screen.getByText(/alertTitle/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'delete' })).toBeTruthy()
  })

  it('paints the confirm as destructive by default', () => {
    open()

    expect(screen.getByRole('button', { name: 'delete' }).className).toContain('bg-red-600')
  })

  it('asks the caller question instead when one is given', () => {
    open({ title: 'Link to building?', description: 'Tower sits on Dunton.', confirmLabel: 'Link', cancelLabel: 'Do not link' })

    expect(screen.getByText('Link to building?')).toBeTruthy()
    expect(screen.getByText('Tower sits on Dunton.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Link' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Do not link' })).toBeTruthy()
  })

  it('leaves a question that destroys nothing looking ordinary', () => {
    open({ title: 'Link to building?', confirmLabel: 'Link', tone: 'default' })

    expect(screen.getByRole('button', { name: 'Link' }).className).not.toContain('bg-red-600')
  })
})
