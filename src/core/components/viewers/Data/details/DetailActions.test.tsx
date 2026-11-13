// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ViewerNames } from '../../../../types'

import DetailActions from './DetailActions'

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }))

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../../store', () => ({
  BuildingsContext: React.createContext({ dispatch }),
  DatasetsContext: React.createContext({ dispatch: vi.fn() }),
  MapContext: React.createContext({ state: { map: {} } }),
  MenusContext: React.createContext({ dispatch: vi.fn() }),
  useMapSitesContext: () => ({ dispatch: vi.fn() }),
  usePermissions: () => ({ ability: { can: () => true } }),
}))
vi.mock('../../../../hooks/sites/sites', () => ({ useDeleteSite: () => ({ deleteSite: vi.fn(), isMutating: false }) }))
vi.mock('../../../../hooks/users/users', () => ({ useUser: () => ({ deleteUser: vi.fn(), isDeleting: false }) }))
vi.mock('../../map/src/MapLayers/src/SiteLayer/useShowSitesOnMap', () => ({ useShowSitesOnMap: () => vi.fn() }))
vi.mock('../../map/src/BuildingFocus/useBuildingFocus', () => ({ useBuildingFocus: () => ({ focus: vi.fn(), clear: vi.fn(), hasFocus: false }) }))
vi.mock('../files/FileMoreOptions', () => ({ default: () => null }))
vi.mock('../../../ui/ExportData', () => ({ default: () => null }))
vi.mock('./FileUpload', () => ({ default: () => null }))
vi.mock('../buildingDetails/DeleteBuildingDialog', () => ({
  default: ({ onRemoved }: { onRemoved: (result: unknown) => void }) => (
    <button onClick={() => onRemoved({ buildingId: 1 })}>removed</button>
  ),
}))
vi.mock('../../../ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}))

describe('DetailActions', () => {
  it('returns to the table after a building is removed', () => {
    const setView = vi.fn()
    render(
      <DetailActions
        editing={false}
        activeChanges={false}
        currentViewer={ViewerNames.buildings}
        selectedItem={{ id: 1, buildingName: 'B' } as never}
        activeBuildingTab="details"
        activeSiteTab="details"
        onSave={vi.fn()}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
        onDeleteUser={vi.fn()}
        setView={setView}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'removed' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'REMOVE-BUILDING', payload: { buildingId: 1 } })
    expect(setView).toHaveBeenCalledWith('table')
  })
})
