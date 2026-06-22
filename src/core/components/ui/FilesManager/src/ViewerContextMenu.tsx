'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { FileMenuContent } from './FileItemComponent'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../DropdownMenu'
import type { DbFile } from '../../../../types/dbTypes'
import type { FileAction } from '../../../../types/global'

export interface ViewerContextMenuProps {
  x: number
  y: number
  file: DbFile & { isVisible?: boolean }
  options: FileAction[]
  onAction: (action: FileAction, file: DbFile) => void
  onClose: () => void
}

export const ViewerContextMenu: React.FC<ViewerContextMenuProps> = ({
  x, y, file, options, onAction, onClose,
}) => {
  const handleAction = React.useCallback((action: FileAction, f: DbFile) => {
    onClose()
    onAction(action, f)
  }, [onAction, onClose])

  return (
    <DropdownMenu open modal={false} onOpenChange={(open) => { if (!open) onClose() }}>
      <DropdownMenuTrigger
        className="fixed opacity-0 pointer-events-none w-px h-px"
        style={{ left: x, top: y }}
      />
      <DropdownMenuContent side="bottom" align="start" className="w-44">
        <FileMenuContent
          file={file}
          options={options}
          onAction={handleAction}
          confirmDelete={true}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
