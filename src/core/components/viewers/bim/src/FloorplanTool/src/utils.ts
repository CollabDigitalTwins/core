// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/**
 * Resolve the localIds of items contained in the given storey via the IFC
 * `ContainedInStructure` relation. Returns [] if the relation isn't indexed
 * (caller should fall back to the full item list).
 */
export async function getStoreyItemIds(
  model: any,
  storeyLocalId: number,
): Promise<number[]> {
  try {
    const ids: number[] = await model.getItemsByQuery({
      relation: {
        name: 'ContainedInStructure',
        query: {
          attributes: {
            queries: [{ name: /.*/, itemIds: [storeyLocalId] }],
          },
        },
      },
    })
    return Array.isArray(ids) ? ids : []
  } catch {
    return []
  }
}

export function normalizeElevation(
  raw: number,
  coordHeight: number,
  minY: number,
  maxY: number,
): number {
  let elevation = raw

  if (elevation > maxY + 200 || elevation < minY - 200) {
    const inMeters = elevation / 1000
    if (inMeters > minY - 50 && inMeters < maxY + 50) {
      elevation = inMeters
    }
  }

  const elevWithCoord = elevation + coordHeight
  const inBoundsRaw = elevation >= minY - 10 && elevation <= maxY + 10
  const inBoundsCoord =
    elevWithCoord >= minY - 10 && elevWithCoord <= maxY + 10

  if (inBoundsCoord && !inBoundsRaw) return elevWithCoord
  if (inBoundsRaw && !inBoundsCoord) return elevation
  return elevWithCoord
}
