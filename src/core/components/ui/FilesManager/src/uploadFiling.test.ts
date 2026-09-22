// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { uploadFiling } from './uploadFiling'

describe('uploadFiling', () => {
  it('files an IFC as a BIM file, whatever the caller left unset', () => {
    expect(uploadFiling('tower.ifc', undefined, undefined).tag).toBe('bim-file')
  })

  it('files the fragments an IFC converts into the same way', () => {
    expect(uploadFiling('tower.frag', undefined, undefined).tag).toBe('bim-file')
  })

  it('leaves another kind of file with the caller tag, or the plain one', () => {
    expect(uploadFiling('plan.pdf', 'user', undefined).tag).toBe('user')
    expect(uploadFiling('plan.pdf', undefined, undefined).tag).toBe('file')
  })

  it('uploads visible, so a viewer that gates loading on it will load what was just added', () => {
    expect(uploadFiling('tower.ifc', undefined, undefined).isVisible).toBe(true)
    expect(uploadFiling('plan.pdf', undefined, undefined).isVisible).toBe(true)
  })

  it('still lets a caller upload something hidden on purpose', () => {
    expect(uploadFiling('tower.ifc', undefined, false).isVisible).toBe(false)
  })

  it('reads the extension whatever the case, and ignores a dotless name', () => {
    expect(uploadFiling('TOWER.IFC', undefined, undefined).tag).toBe('bim-file')
    expect(uploadFiling('readme', undefined, undefined).tag).toBe('file')
  })
})
