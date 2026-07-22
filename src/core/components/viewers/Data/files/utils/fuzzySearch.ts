// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Fuzzy search utility functions
const fuzzySearchScore = (searchTerm: string, text: string): number => {
  if (!searchTerm || !text) return 0

  const search = searchTerm.toLowerCase()
  const target = text.toLowerCase()

  // Exact match gets highest score
  if (target === search) return 1000

  // Starts with search term gets high score
  if (target.startsWith(search)) return 800

  // Contains search term gets medium score
  if (target.includes(search)) return 600

  // Fuzzy matching - calculate similarity based on character matching
  let score = 0
  let searchIndex = 0

  for (let i = 0; i < target.length && searchIndex < search.length; i++) {
    if (target[i] === search[searchIndex]) {
      score += 10
      searchIndex++
    }
  }

  // Bonus for matching all characters in sequence
  if (searchIndex === search.length) {
    score += 100
  }

  // Penalize for length difference
  const lengthDiff = Math.abs(target.length - search.length)
  score -= lengthDiff * 2

  return Math.max(0, score)
}

export const fuzzySearchBuildings = (buildings: any[], searchTerm: string) => {
  if (!searchTerm.trim()) return buildings.slice(0, 10)
  return buildings
    .map((building) => {
      const address = building.buildingAddress || building.buildingAnchorAddress || ''
      const propertyName = building.buildingName || ''

      // Calculate scores for different fields
      const addressScore = fuzzySearchScore(searchTerm, address)
      const propertyScore = fuzzySearchScore(searchTerm, propertyName)

      // Use the highest score
      const maxScore = Math.max(addressScore, propertyScore)
      return {
        ...building,
        searchScore: maxScore,
        matchedField: addressScore > propertyScore ? 'address' : 'propertyName',
      }
    })
    .filter(building => building.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, 10) // Return only the top 10 results
}
