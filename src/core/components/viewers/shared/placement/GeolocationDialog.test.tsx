// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateFile = vi.fn()

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../../hooks/files/files', () => ({ useUpdateFile: () => updateFile }))
vi.mock('../../../../store', async () => {
  const { createContext } = await import('react')
  return {
    BimContext: createContext({ state: { bim: { bimModelsAddedToMap: [] } } }),
    MapContext: createContext({ state: { map: { map: null } } }),
  }
})
vi.mock('../../../ui/LabelledSelect', () => ({ LabelledSelect: ({ label }: { label: string }) => <span>{label}</span> }))

import { GeolocationDialog } from './GeolocationDialog'

import type { DbFile } from '../../../../types/dbTypes'

const PETAWAWA: Partial<DbFile> = {
  fileProjectedCRS: 'EPSG:2951',
  mapConversionEastings: 242177.285039641,
  mapConversionNorthings: 5085871.80253713,
  mapConversionXAxisAbscissa: 1,
  mapConversionXAxisOrdinate: 0,
}

const renderDialog = (file: Partial<DbFile>) =>
  render(<GeolocationDialog file={{ id: 3, name: 'model.frag', ...file } as DbFile} open onOpenChange={vi.fn()} />)

describe('GeolocationDialog', () => {
  beforeEach(() => { updateFile.mockReset().mockResolvedValue({}) })

  it('saves the source columns and the position they convert to', async () => {
    renderDialog({ lng: -75.7, lat: 45.4 })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    await waitFor(() => expect(updateFile).toHaveBeenCalled())
    expect(updateFile).toHaveBeenCalledWith(3, expect.objectContaining({
      fileProjectedCRS: 'EPSG:4326',
      mapConversionEastings: -75.7,
      lng: -75.7,
      lat: 45.4,
      georeferenceSource: 'manual',
    }))
  })

  it('offers a revert only once the file has moved off its source position', () => {
    renderDialog({ ...PETAWAWA, lng: -75, lat: 45, rotation: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'revert' }))

    expect(updateFile).toHaveBeenCalledWith(3, expect.objectContaining({ lat: expect.closeTo(45.9098, 3) }))
  })

  it('hides revert while the file stands at its source', () => {
    renderDialog({ fileProjectedCRS: 'EPSG:4326', mapConversionEastings: -75.7, mapConversionNorthings: 45.4, lng: -75.7, lat: 45.4, rotation: 0 })

    expect(screen.queryByRole('button', { name: 'revert' })).toBeNull()
  })

  it('keeps an edit when the row is re-rendered with a fresh file object', () => {
    const file = { id: 3, name: 'model.frag', ...PETAWAWA } as DbFile
    const { rerender } = render(<GeolocationDialog file={file} open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('easting'), { target: { value: '1' } })

    rerender(<GeolocationDialog file={{ ...file }} open onOpenChange={vi.fn()} />)

    expect(screen.getByLabelText('easting')).toHaveProperty('value', '1')
  })

  it('resets one field to the value the dialog opened with', () => {
    renderDialog(PETAWAWA)
    fireEvent.change(screen.getByLabelText('easting'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('northing'), { target: { value: '2' } })

    fireEvent.click(screen.getAllByRole('button', { name: 'resetField' })[0])

    expect(screen.getByLabelText('easting')).toHaveProperty('value', '242177.285039641')
    expect(screen.getByLabelText('northing')).toHaveProperty('value', '2')
  })

  it('resets every field at once', () => {
    renderDialog(PETAWAWA)
    fireEvent.change(screen.getByLabelText('easting'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('northing'), { target: { value: '2' } })

    fireEvent.click(screen.getByRole('button', { name: 'resetAll' }))

    expect(screen.getByLabelText('northing')).toHaveProperty('value', '5085871.80253713')
    expect(screen.queryByRole('button', { name: 'resetField' })).toBeNull()
  })
})
