// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { isEditableTarget } from './utils'

const OPEN_OVERLAY_SELECTOR = '[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]'

/** True when a page-level Escape belongs to a text field or an open dialog, menu or popover instead. */
export function shouldIgnoreEscape(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || isEditableTarget(event.target)) return true
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null
}
