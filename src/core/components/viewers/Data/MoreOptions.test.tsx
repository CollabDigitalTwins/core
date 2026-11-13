// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DataTypesNames } from '../../../types/'

import MoreOptions from './MoreOptions'

const { canDelete } = vi.hoisted(() => ({ canDelete: { value: true } }))

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("../../../store", () => {
  return {
    BuildingsContext: React.createContext({ dispatch: vi.fn() }),
    DatasetsContext: React.createContext({ dispatch: vi.fn() }),
    MapContext: React.createContext({ state: { map: {} } }),
    MenusContext: React.createContext({ dispatch: vi.fn() }),
    useMapSitesContext: () => ({ dispatch: vi.fn() }),
    usePermissions: () => ({
      ability: { can: (action: string, subject: string) => action !== 'delete' || subject !== 'Building' || canDelete.value },
    }),
  }
})
vi.mock('../../../hooks/sites/sites', () => ({ useDeleteSite: () => ({ deleteSite: vi.fn(), isMutating: false }) }))
vi.mock('../../../hooks/users/users', () => ({ useUser: () => ({ deleteUser: vi.fn(), isDeleting: false }) }))
vi.mock('../map/src/MapLayers/src/SiteLayer/useShowSitesOnMap', () => ({ useShowSitesOnMap: () => vi.fn() }))
vi.mock('../map/src/BuildingFocus/useBuildingFocus', () => ({ useBuildingFocus: () => ({ focus: vi.fn(), clear: vi.fn(), hasFocus: false }) }))
vi.mock('./files/FileMoreOptions', () => ({ default: () => null }))
vi.mock('../../ui/ExportData', () => ({ default: () => null }))
vi.mock('./buildingDetails/DeleteBuildingDialog', () => ({ default: () => null }))
vi.mock('../../ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}))

const row = { id: 1, buildingName: 'B' } as never

describe('MoreOptions', () => {
  it("shows Delete Building only when ability.can('delete','Building')", () => {
    canDelete.value = true
    const { unmount } = render(<MoreOptions row={row} dataType={DataTypesNames.building} />)
    expect(screen.queryByText('deleteBuilding')).toBeTruthy()
    unmount()
    canDelete.value = false
    render(<MoreOptions row={row} dataType={DataTypesNames.building} />)
    expect(screen.queryByText('deleteBuilding')).toBeNull()
  })
})
