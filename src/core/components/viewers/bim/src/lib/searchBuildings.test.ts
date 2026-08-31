// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { buildingScore, searchBuildings, SEARCH_RESULT_LIMIT } from './searchBuildings'

import type { Building } from '../../../../../types/dbTypes'

function building(overrides: Partial<Building> & { id: number }) {
    return { buildingType: [], ...overrides } as Building
}

const PATERSON = building({ id: 1, buildingName: 'Paterson Hall', buildingAddress: '1125 Colonel By Dr' })
const NICOL = building({ id: 2, buildingName: 'Nicol Building', buildingAddress: '1200 Library Rd' })
const TORY = building({ id: 33, buildingName: 'Tory Building' })

describe('buildingScore', () => {
    it('ranks an exact name above a prefix above a substring', () => {
        const exact = buildingScore(building({ id: 1, buildingName: 'Tory' }), 'Tory')
        const prefix = buildingScore(building({ id: 1, buildingName: 'Tory Building' }), 'Tory')
        const contains = buildingScore(building({ id: 1, buildingName: 'Old Tory Annex' }), 'Tory')

        expect(exact).toBeGreaterThan(prefix)
        expect(prefix).toBeGreaterThan(contains)
        expect(contains).toBeGreaterThan(0)
    })

    it('matches on address and on the id, not just the name', () => {
        expect(buildingScore(PATERSON, 'Colonel By')).toBeGreaterThan(0)
        expect(buildingScore(TORY, '33')).toBeGreaterThan(0)
    })

    it('is case insensitive', () => {
        expect(buildingScore(PATERSON, 'paterson')).toBe(buildingScore(PATERSON, 'PATERSON'))
    })

    it('scores nothing for a term that appears nowhere', () => {
        expect(buildingScore(PATERSON, 'zzz')).toBe(0)
    })

    it('tolerates a building with no name or address', () => {
        expect(() => buildingScore(building({ id: 7 }), 'anything')).not.toThrow()
    })
})

describe('searchBuildings', () => {
    it('returns the best match first', () => {
        const results = searchBuildings([NICOL, PATERSON, TORY], 'Paterson')

        expect(results[0]).toBe(PATERSON)
    })

    it('drops buildings that do not match at all', () => {
        expect(searchBuildings([NICOL, PATERSON, TORY], 'Paterson')).toHaveLength(1)
    })

    it('shows the head of the list for an empty term, rather than nothing', () => {
        expect(searchBuildings([NICOL, PATERSON, TORY], '   ')).toHaveLength(3)
    })

    it('caps how many it returns', () => {
        const many = Array.from({ length: 40 }, (_, i) => building({ id: i, buildingName: `Hall ${i}` }))

        expect(searchBuildings(many, 'Hall')).toHaveLength(SEARCH_RESULT_LIMIT)
        expect(searchBuildings(many, '')).toHaveLength(SEARCH_RESULT_LIMIT)
    })

    it('does not mutate or re-wrap the buildings it was given', () => {
        const results = searchBuildings([PATERSON], 'Paterson')

        expect(results[0]).toBe(PATERSON)
        expect(Object.hasOwn(results[0], 'searchScore')).toBe(false)
    })
})
