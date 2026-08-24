// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'AppSidebarContent.tsx'), 'utf8')

/**
 * A source guard rather than a render test: the component pulls in a dozen contexts, and the
 * bug it protects against is a one-line filter, not a rendering decision.
 */
describe('AppSidebarContent viewer access', () => {
  it('filters the dataset nav through isViewerAllowed', () => {
    expect(source).toMatch(/visibleDatasetItems[\s\S]{0,120}isViewerAllowed/)
  })

  // resolveAppContent never returns an empty list, so this test on its own would have
  // hidden every plugin page from every organization rather than only restricted ones.
  it('does not gate any nav item on appContent membership directly', () => {
    expect(source).not.toMatch(/appContent\.includes\(item\.id/)
  })
})
