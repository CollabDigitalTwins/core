// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Building } from '../../../../../types/dbTypes'

export const SEARCH_RESULT_LIMIT = 10

const EXACT = 1000
const PREFIX = 800
const CONTAINS = 600

function fieldScore(search: string, text: string): number {
    if (!search || !text) return 0
    const needle = search.toLowerCase()
    const haystack = text.toLowerCase()

    if (haystack === needle) return EXACT
    if (haystack.startsWith(needle)) return PREFIX
    if (haystack.includes(needle)) return CONTAINS
    return 0
}

/** Best of the fields a person would search a building by: name, address, or the id itself. */
export function buildingScore(building: Building, searchTerm: string): number {
    return Math.max(
        fieldScore(searchTerm, building.buildingName ?? ''),
        fieldScore(searchTerm, building.buildingAddress ?? ''),
        fieldScore(searchTerm, String(building.id)),
    )
}

/**
 * Ranks buildings by how well they match, best first. An empty term is not a filter — it
 * returns the head of the list, so an unfocused search box still shows somewhere to start.
 */
export function searchBuildings(
    buildings: readonly Building[],
    searchTerm: string,
    limit = SEARCH_RESULT_LIMIT,
): Building[] {
    if (!searchTerm.trim()) return buildings.slice(0, limit)

    return buildings
        .map(building => ({ building, score: buildingScore(building, searchTerm) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(entry => entry.building)
}
