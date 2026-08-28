// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))

vi.mock('../../../../store', () => ({
  MenusContext: React.createContext({ state: { menus: { currentViewer: 'bim' } } }),
  usePermissions: () => ({ ability: { can: () => true } }),
}))

vi.mock('../../../ConfirmDialog', () => ({ default: () => null }))

vi.mock('../../DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div role="menuitem">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}))

import { FileMenuContent } from './FileItemComponent'

import type { DbFile } from '../../../../types/dbTypes'
import type { FileAction } from '../../../../types/global'

const SCENE_OPTIONS: FileAction[] = ['view', 'ghost', 'move', 'download', 'info', 'delete']

function renderMenu(isVisible: boolean | undefined, options: FileAction[] = SCENE_OPTIONS) {
  render(
    <FileMenuContent
      file={{ id: 1, name: 'scan.laz', isVisible } as DbFile & { isVisible?: boolean }}
      onAction={vi.fn()}
      options={options}
    />,
  )
}

const items = () => screen.queryAllByRole('menuitem').map((item) => item.textContent)

describe('FileMenuContent scene tools', () => {
  it('offers the scene tools while the file is in the scene', () => {
    renderMenu(true)

    expect(items()).toEqual(expect.arrayContaining(['ghostTitle', 'moveTitle', 'downloadTitle']))
  })

  it('withdraws them while the file is hidden, since they act on something not on screen', () => {
    renderMenu(false)

    expect(items()).not.toEqual(expect.arrayContaining(['ghostTitle']))
    expect(items()).not.toEqual(expect.arrayContaining(['moveTitle']))
    expect(items()).not.toEqual(expect.arrayContaining(['downloadTitle']))
  })

  it('keeps show, info and delete reachable while hidden, or the row could not be switched back on', () => {
    renderMenu(false)

    expect(items()).toEqual(expect.arrayContaining(['showTitle', 'infoTitle', 'deleteTitle']))
  })

  it('treats an untracked visibility as visible, the way the row styling already does', () => {
    renderMenu(undefined)

    expect(items()).toEqual(expect.arrayContaining(['ghostTitle', 'downloadTitle']))
  })

  it('keeps download on a row that is not scene content at all', () => {
    renderMenu(false, ['download', 'view', 'delete'])

    expect(items()).toEqual(expect.arrayContaining(['downloadTitle']))
  })
})
