// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DeleteBuildingDialog from './DeleteBuildingDialog'

type Associations = { files: number; sensors: number; comments: number; isDefaultLocation: boolean }

const { removeBuilding, associationsState, loadState } = vi.hoisted(() => ({
  removeBuilding: vi.fn(),
  associationsState: { value: null as Associations | null },
  loadState: { isLoading: false, error: undefined as Error | undefined },
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}))
vi.mock('../../../../hooks/buildings/buildings', () => ({
  useBuildingAssociations: () => ({ associations: associationsState.value, ...loadState }),
  useRemoveBuilding: () => ({ removeBuilding, isMutating: false }),
  useBuildings: () => ({
    buildings: [
      { id: 1, buildingName: 'Self' },
      { id: 3, buildingName: 'Zeta' },
      { id: 2, buildingName: 'Alpha' },
    ],
  }),
}))
vi.mock('../../../ui/Select', () => ({
  Select: ({ onValueChange, children }: { onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select aria-label="target" onChange={e => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}))

const building = { id: 1, buildingName: 'Self' } as never

const renderDialog = () => render(
  <DeleteBuildingDialog building={building} open onOpenChange={vi.fn()} onRemoved={vi.fn()} />,
)

describe('DeleteBuildingDialog', () => {
  beforeEach(() => {
    removeBuilding.mockReset().mockResolvedValue({})
    associationsState.value = { files: 2, sensors: 1, comments: 4, isDefaultLocation: false }
    loadState.isLoading = false
    loadState.error = undefined
  })

  it('hides the transfer option when nothing is associated', () => {
    associationsState.value = { files: 0, sensors: 0, comments: 0, isDefaultLocation: false }
    renderDialog()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('offers transfer when the building is only the default location', () => {
    associationsState.value = { files: 0, sensors: 0, comments: 0, isDefaultLocation: true }
    renderDialog()
    expect(screen.getByRole('switch')).toBeTruthy()
    expect(screen.getByText(/defaultOutcome.*"isDefaultLocation":"true"/)).toBeTruthy()
  })

  it('disables confirm and shows a message when the counts failed to load', () => {
    associationsState.value = null
    loadState.error = new Error('boom')
    renderDialog()
    expect(screen.getByText('loadFailed')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'confirm' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables confirm while the counts load', () => {
    associationsState.value = null
    loadState.isLoading = true
    renderDialog()
    expect((screen.getByRole('button', { name: 'confirm' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows counts and the transfer picker excluding the building itself', () => {
    renderDialog()
    expect(screen.getByText(/"files":2,"sensors":1,"comments":4/)).toBeTruthy()
    fireEvent.click(screen.getByRole('switch'))
    const options = screen.getAllByRole('option').map(o => o.textContent).filter(Boolean)
    expect(options).toEqual(['Alpha', 'Zeta'])
  })

  it('confirm calls removeBuilding without a target by default', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    expect(removeBuilding).toHaveBeenCalledWith(1, undefined)
  })

  it('confirm calls removeBuilding with transferToBuildingId when a target is chosen', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.change(screen.getByLabelText('target'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'confirm' }))
    expect(removeBuilding).toHaveBeenCalledWith(1, { transferToBuildingId: 2 })
  })

  it('confirm is disabled while the transfer toggle is on and no target is chosen', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('switch'))
    expect((screen.getByRole('button', { name: 'confirm' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('cancel turns the transfer toggle back off for the next open', () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(<DeleteBuildingDialog building={building} open onOpenChange={onOpenChange} onRemoved={vi.fn()} />)
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    rerender(<DeleteBuildingDialog building={building} open onOpenChange={onOpenChange} onRemoved={vi.fn()} />)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
  })
})
