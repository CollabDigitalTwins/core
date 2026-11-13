// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { hasFileTransform, type FileTransformColumns } from '../../../shared/placement/fileTransform'

interface SeedableFile extends FileTransformColumns {
  id: number
  extension?: string | null
  isVisible?: boolean
}

/**
 * The files a freshly opened scene should put back: opted in, placeable, already given a
 * scene position, and not already standing in the scene. Unplaced files wait for "Place".
 */
export function selectSceneSeedFiles<T extends SeedableFile>(
  files: T[],
  isPlaceable: (extension?: string | null) => boolean,
  isInScene: (key: string) => boolean,
): T[] {
  return files.filter(file =>
    file.isVisible === true
    && isPlaceable(file.extension)
    && hasFileTransform(file)
    && !isInScene(String(file.id)))
}
