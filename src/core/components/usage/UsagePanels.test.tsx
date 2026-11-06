// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MyUsage, OrganizationUsage } from './UsagePanels'

import type { UserUsageReport } from '../../types/usage'

const hooks = vi.hoisted(() => ({ useMyUsage: vi.fn(), useOrganizationUsage: vi.fn() }))

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }))
vi.mock('../../hooks/usage/usage', () => hooks)
vi.mock('./VolumeOverview', () => ({ VolumeOverview: () => <div>overview</div> }))

const report: UserUsageReport = {
  totals: { storedGB: 4, fileCount: 3, unsizedCount: 0 },
  byMonth: [],
  byType: [],
  rows: [
    { userId: 1, name: 'Ada', email: 'ada@acme.org', organizationName: 'acme', organizationTitle: 'Acme', storedGB: 1, fileCount: 1, lastUploadAt: null },
    { userId: null, name: null, email: null, organizationName: 'acme', organizationTitle: 'Acme', storedGB: 3, fileCount: 2, lastUploadAt: null },
  ],
}

const firstCells = () => screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent)

describe('usage panels', () => {
  beforeEach(() => {
    hooks.useMyUsage.mockReturnValue({ report: null, isLoading: false, isError: null })
    hooks.useOrganizationUsage.mockReturnValue({ report, isLoading: false, isError: null })
  })

  it('shows the load error instead of an empty report', () => {
    hooks.useMyUsage.mockReturnValue({ report: null, isLoading: false, isError: new Error('HTTP 500') })
    render(<MyUsage />)
    expect(screen.getByRole('alert').textContent).toBe('loadFailed')
  })

  it('lists uploaders largest first, with pre-tracking files as unattributed', () => {
    render(<OrganizationUsage />)
    expect(firstCells()).toEqual(['unattributed', 'Adaada@acme.org'])
  })

  it('re-sorts by name when the column header is clicked', () => {
    render(<OrganizationUsage />)
    fireEvent.click(screen.getByRole('button', { name: 'user' }))
    expect(firstCells()).toEqual(['unattributed', 'Adaada@acme.org'])
    fireEvent.click(screen.getByRole('button', { name: 'user' }))
    expect(firstCells()).toEqual(['Adaada@acme.org', 'unattributed'])
  })
})
