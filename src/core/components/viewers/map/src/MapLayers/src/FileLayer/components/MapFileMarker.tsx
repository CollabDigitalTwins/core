// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import { Button } from '../../../../../../../../components/ui/Button'
import { UploadProgressRing } from '../../../../../../../ui/FilesManager/src/MarkerProgressRing'

import FileIcon from './FileIcon'

interface MapFileMarkerProps {
  mimeType: string
  extension?: string
  url?: string | null
  onClick?: () => void
  onDbClick?: () => void
  /** Draws this pin's upload ring while a task with the same name is in flight. */
  fileName?: string
}

export default function MapFileMarker({
  mimeType,
  extension,
  url,
  onClick,
  onDbClick,
  fileName,
}: MapFileMarkerProps) {
  return (
    <Button
      variant="outline"
      size="default"
      onClick={onClick}
      onDoubleClick={onDbClick}
      className="relative bg-white/90 w-9 h-9 rounded-full border border-gray-200 hover:bg-white pointer-events-auto cursor-pointer shadow-lg p-0 text-xs font-sans flex items-center justify-center transition-transform duration-200 ease-in-out hover:scale-105 group"
    >
      <FileIcon mimeType={mimeType} extension={extension} url={url} size={18} />
      {fileName && <UploadProgressRing fileName={fileName} tone="onSurface" />}
    </Button>
  )
}
