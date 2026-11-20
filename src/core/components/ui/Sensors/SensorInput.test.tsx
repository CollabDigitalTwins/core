// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { act, fireEvent, render } from '@testing-library/react'
import * as React from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { createSensorMock, map } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(e: unknown) => void>>()
  return {
    createSensorMock: vi.fn(),
    map: {
      listeners,
      on: (type: string, fn: (e: unknown) => void) => { listeners.set(type, (listeners.get(type) ?? new Set()).add(fn)) },
      off: (type: string, fn: (e: unknown) => void) => { listeners.get(type)?.delete(fn) },
      fire: (type: string, e: unknown) => listeners.get(type)?.forEach(fn => fn(e)),
      getCanvas: () => ({ style: { cursor: '' } }),
      queryTerrainElevation: () => 0,
    },
  }
})

vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((key: string) => key, { has: () => true }) }))
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: '7', organizationId: 3 } } }) }))
vi.mock('../../../hooks/sensors/sensors', () => ({
  useCreateSensor: () => ({ createSensor: createSensorMock }),
  useSensor: () => ({ updateSensor: vi.fn() }),
}))
vi.mock('../../../hooks/sensorTypes/sensorTypes', () => ({ useSensorTypes: () => ({ sensorTypes: [{ id: 4, name: 'temperature' }] }) }))
vi.mock('./SensorTagsSection', () => ({ SensorTagsSection: () => null }))
vi.mock('../../../store', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  return {
    AppConfigContext: React.createContext({ state: {} }),
    MapContext: React.createContext({ state: { map: { map } } }),
    BuildingsContext: React.createContext({ state: { buildings: { building: null } } }),
    MenusContext: React.createContext({ state: { menus: { currentSensorTypeId: 4 } }, dispatch: vi.fn() }),
    ToolsContext: React.createContext({ state: { tools: { currentToolId: 'map-add-sensor' } } }),
  }
})

import { ViewerNames } from '../../../types/dbTypes'

import { SensorInput } from './SensorInput'

const anchor = <T extends HTMLElement>(name: string) => document.querySelector<T>(`[data-tour="${name}"]`)!

const dblclick = () => act(() => map.fire('dblclick', { lngLat: { lng: -75.7, lat: 45.4 } }))

function startPlacing() {
  const view = render(<SensorInput viewer={ViewerNames.map} layout="dialog" isOpen />)
  fireEvent.change(anchor('sensor-input-name'), { target: { value: 'Demo' } })
  fireEvent.change(anchor('sensor-input-url'), { target: { value: 'https://example.org/data' } })
  fireEvent.click(anchor('sensor-place'))
  return view
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

beforeEach(() => {
  createSensorMock.mockReset()
  createSensorMock.mockResolvedValue({})
  map.listeners.clear()
})

describe('SensorInput placing on the map', () => {
  it('creates the sensor where the map is double-clicked while placing', () => {
    startPlacing()
    dblclick()
    expect(createSensorMock).toHaveBeenCalledWith({ sensorData: expect.objectContaining({ name: 'Demo', typeId: 4, longitude: -75.7 }) })
  })

  it('stops placing once the dialog is closed', () => {
    const { rerender } = startPlacing()
    rerender(<SensorInput viewer={ViewerNames.map} layout="dialog" isOpen={false} />)
    dblclick()
    expect(createSensorMock).not.toHaveBeenCalled()
  })
})
