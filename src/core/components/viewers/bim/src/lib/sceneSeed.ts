// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

interface SeedableFile {
  id: number
  extension?: string | null
  isVisible?: boolean
}

/**
 * The files a freshly opened scene should put back: opted in on the record, of a kind
 * that can hold a place, and not already standing in the scene.
 */
export function selectSceneSeedFiles<T extends SeedableFile>(
  files: T[],
  isPlaceable: (extension?: string | null) => boolean,
  isInScene: (key: string) => boolean,
): T[] {
  return files.filter(file =>
    file.isVisible === true
    && isPlaceable(file.extension)
    && !isInScene(String(file.id)))
}
