// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Wraps a Radix `onInteractOutside` so closing a toast does not also close the open dialog or menu. */
export function keepOpenOnToast<E extends Event>(onInteractOutside?: (event: E) => void) {
  return (event: E) => {
    if (event.target instanceof Element && event.target.closest('[data-sonner-toaster]')) event.preventDefault()
    onInteractOutside?.(event)
  }
}
