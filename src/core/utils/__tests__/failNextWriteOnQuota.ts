// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { vi } from 'vitest'

/** Makes the next `localStorage.setItem` throw a full-quota error; later writes go through. */
export function failNextWriteOnQuota(): void {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('full', 'QuotaExceededError') })
}
