// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { EXTENSIONS_FOR_TYPE, extensionOfName } from './fileType'

export interface UploadFiling {
  tag: string
  isVisible: boolean
}

/**
 * How an upload is filed: a BIM keeps the tag its sections and viewers look for, and anything
 * uploaded is visible, since a viewer that gates loading on the column would never load it.
 */
export function uploadFiling(fileName: string, tag?: string, isVisible?: boolean): UploadFiling {
  const extension = extensionOfName(fileName)
  const isBim = EXTENSIONS_FOR_TYPE['bim-file'].includes(extension)

  return {
    tag: isBim ? 'bim-file' : tag ?? 'file',
    isVisible: isVisible ?? true,
  }
}
