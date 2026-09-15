// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect } from 'vitest'

import { uniqueFileName } from './uniqueFileName'

describe('uniqueFileName', () => {
  it('returns the name unchanged when nothing has taken it', () => {
    expect(uniqueFileName('plan.dxf', ['other.dxf'])).toBe('plan.dxf')
  })

  it('inserts the counter before the extension', () => {
    expect(uniqueFileName('plan.dxf', ['plan.dxf'])).toBe('plan (1).dxf')
  })

  it('counts up past every taken suffix', () => {
    expect(uniqueFileName('plan.dxf', ['plan.dxf', 'plan (1).dxf'])).toBe('plan (2).dxf')
  })

  it('appends when the name has no extension', () => {
    expect(uniqueFileName('Scan', ['Scan'])).toBe('Scan (1)')
  })

  it('treats a leading dot as part of the name, not an extension', () => {
    expect(uniqueFileName('.env', ['.env'])).toBe('.env (1)')
  })

  it('keeps a multi-part extension intact on the final segment only', () => {
    expect(uniqueFileName('site.copc.laz', ['site.copc.laz'])).toBe('site.copc (1).laz')
  })
})
