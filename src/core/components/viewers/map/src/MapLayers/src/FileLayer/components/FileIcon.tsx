// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { iconForFile } from '../../../../../../../../utils/fileIconsUtils'

interface FileIconProps {
  mimeType?: string
  extension?: string
  url?: string | null
  size?: number
}

/** A file's icon, or its own thumbnail when it is an image the browser can already show. */
export default function FileIcon({ mimeType, extension, url, size }: FileIconProps) {
  if (url && mimeType?.startsWith('image/')) {
    return <img src={url} width={28} height={28} alt="File preview" className="rounded object-cover" />
  }

  const Icon = iconForFile({ mimeType, extension })
  return <Icon size={size} />
}
