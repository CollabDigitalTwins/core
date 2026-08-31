// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { BuildingsContext } from '../../../../../store'

import { FALLBACK_LOCATION, useViewerLocation } from './useViewerLocation'

import type { Building } from '../../../../../types/dbTypes'

const searchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }))

function withBuilding(building: Building | null) {
    return ({ children }: { children: React.ReactNode }) => React.createElement(
        BuildingsContext.Provider,
        { value: { state: { buildings: { buildings: [], building } }, dispatch: vi.fn() } as never },
        children,
    )
}

function building(overrides: Partial<Building> = {}) {
    return {
        id: 1,
        buildingType: [],
        buildingName: 'Paterson Hall',
        buildingLatitude: 45.3821,
        buildingLongitude: -75.6983,
        ...overrides,
    } as Building
}

describe('useViewerLocation', () => {
    it('takes the north offset from the map placement rotation', () => {
        const wrapper = withBuilding(building({ rotation: 37 }))

        const { result } = renderHook(() => useViewerLocation(), { wrapper })

        expect(result.current.northOffset).toBe(37)
    })

    it('ignores bimRotation, which is project north and unrelated to the sun', () => {
        const wrapper = withBuilding(building({ bimRotation: 1.2 } as Partial<Building>))

        const { result } = renderHook(() => useViewerLocation(), { wrapper })

        expect(result.current.northOffset).toBe(0)
    })

    it('reports the building coordinates a sun study needs', () => {
        const wrapper = withBuilding(building())

        const { result } = renderHook(() => useViewerLocation(), { wrapper })

        expect(result.current.latitude).toBeCloseTo(45.3821)
        expect(result.current.longitude).toBeCloseTo(-75.6983)
    })

    it('falls back when the building carries no coordinates', () => {
        const wrapper = withBuilding(building({ buildingLatitude: undefined, buildingLongitude: undefined }))

        const { result } = renderHook(() => useViewerLocation(), { wrapper })

        expect(result.current).toEqual(FALLBACK_LOCATION)
    })
})
