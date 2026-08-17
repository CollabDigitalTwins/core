// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { ViewerNames } from '../../types/dbTypes'

import { isViewerAllowed } from './viewerAccess'

const RESTRICTED = [ViewerNames.map, ViewerNames.buildings]

describe('isViewerAllowed', () => {
  describe('a built-in viewer', () => {
    it('is allowed when the organization restricts nothing', () => {
      expect(isViewerAllowed(ViewerNames.bim, [])).toBe(true)
    })

    it('is allowed when appContent lists it', () => {
      expect(isViewerAllowed(ViewerNames.buildings, RESTRICTED)).toBe(true)
    })

    it('is refused when appContent omits it', () => {
      expect(isViewerAllowed(ViewerNames.bim, RESTRICTED)).toBe(false)
    })
  })

  // appContent is a Prisma enum and can never hold a plugin key.
  describe('a plugin page', () => {
    it('is allowed against a restrictive appContent', () => {
      expect(isViewerAllowed('plugin:room-inventory:rooms', RESTRICTED)).toBe(true)
    })

    it('is allowed when the organization restricts nothing', () => {
      expect(isViewerAllowed('plugin:room-inventory:rooms', [])).toBe(true)
    })
  })

  // A malformed key is not a plugin page, so it falls through to the appContent check.
  it('refuses a malformed plugin key under a restrictive appContent', () => {
    expect(isViewerAllowed('plugin:' as never, RESTRICTED)).toBe(false)
  })
})
