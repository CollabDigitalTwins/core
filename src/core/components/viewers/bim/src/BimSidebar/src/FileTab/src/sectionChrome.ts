// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as React from 'react'

/** Collapse and reorder wiring the File tab drives, passed straight to `CollapsibleSection`. */
export interface FileTabSectionChrome {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
  isReordering?: boolean
}
