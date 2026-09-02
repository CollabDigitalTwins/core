// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('../../../ui/Button', () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}))
vi.mock('../../../ui/Menubar', () => ({
  Menubar: ({ children }: any) => <div>{children}</div>,
}))

import { MapTilerKeyNotice } from './MapTilerKeyNotice'

const atHostname = (hostname: string) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new URL(`http://${hostname}/`),
  })
}

describe('MapTilerKeyNotice', () => {
  it('stays out of the way when the deployment has its own key', () => {
    atHostname('cdtstage.collabdt.org')
    render(<MapTilerKeyNotice maptilerKey="REALKEY" />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('explains the disabled layers and links to a free key when no key is configured', () => {
    atHostname('cdtstage.collabdt.org')
    render(<MapTilerKeyNotice />)

    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('title')).toBeTruthy()
    expect(screen.getByRole('link', { name: /cta/ }).getAttribute('href'))
      .toBe('https://cloud.maptiler.com/account/keys/')
  })

  it('tells a developer on localhost that the demo key will not carry to production', () => {
    atHostname('localhost')
    render(<MapTilerKeyNotice maptilerKey="" />)

    expect(screen.getByText('devTitle')).toBeTruthy()
    expect(screen.getByText('devBody')).toBeTruthy()
  })

  it('can be dismissed', () => {
    atHostname('cdtstage.collabdt.org')
    render(<MapTilerKeyNotice />)

    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
