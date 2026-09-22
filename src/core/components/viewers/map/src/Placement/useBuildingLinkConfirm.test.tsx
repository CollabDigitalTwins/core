// @vitest-environment jsdom

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { act, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign(
    (key: string, values?: Record<string, string>) => `${key}:${values?.building ?? ''}`,
    { has: () => true },
  ),
}))

import { useBuildingLinkConfirm } from './useBuildingLinkConfirm'

function Harness({ onAnswer }: { onAnswer: (linked: boolean) => void }) {
  const { confirmLink, dialog } = useBuildingLinkConfirm()
  return (
    <>
      <button onClick={() => { void confirmLink('Dunton Tower', 'tower.frag').then(onAnswer) }}>ask</button>
      {dialog}
    </>
  )
}

const ask = async () => {
  await act(async () => { screen.getByText('ask').click() })
}

describe('useBuildingLinkConfirm', () => {
  it('asks nothing until a placement lands on a building', () => {
    const { container } = render(<Harness onAnswer={vi.fn()} />)

    expect(container.querySelector('[role="alertdialog"]')).toBeNull()
  })

  it('links when the answer is yes', async () => {
    const onAnswer = vi.fn()
    render(<Harness onAnswer={onAnswer} />)
    await ask()

    await act(async () => { screen.getByRole('button', { name: /linkBuildingConfirm/ }).click() })

    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('leaves the file unattached when the answer is no', async () => {
    const onAnswer = vi.fn()
    render(<Harness onAnswer={onAnswer} />)
    await ask()

    await act(async () => { screen.getByRole('button', { name: /linkBuildingCancel/ }).click() })

    expect(onAnswer).toHaveBeenCalledWith(false)
  })

  it('names the building it is about to attach to', async () => {
    render(<Harness onAnswer={vi.fn()} />)

    await ask()

    expect(screen.getByText(/Dunton Tower/)).toBeTruthy()
  })

  it('answers no rather than hanging when its dialog goes away unanswered', async () => {
    const onAnswer = vi.fn()
    const { unmount } = render(<Harness onAnswer={onAnswer} />)
    await ask()

    await act(async () => { unmount() })

    expect(onAnswer).toHaveBeenCalledWith(false)
  })
})
