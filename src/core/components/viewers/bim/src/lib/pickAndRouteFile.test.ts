// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, it, expect, vi } from 'vitest'

import { acceptAttribute, routePickedFile } from './pickAndRouteFile'

import type { FileRoute } from './pickAndRouteFile'

const route = (over: Partial<FileRoute> = {}): FileRoute => ({
  needsPlacement: () => true,
  onPlace: vi.fn(),
  onSubmit: vi.fn(),
  onReject: vi.fn(),
  ...over,
})

describe('routePickedFile', () => {
  it('sends a file that needs placement to onPlace, not onSubmit', () => {
    const r = route()
    routePickedFile(new File([''], 'model.glb'), r)

    expect(r.onPlace).toHaveBeenCalledOnce()
    expect(r.onSubmit).not.toHaveBeenCalled()
  })

  it('uploads a file that carries its own coordinates straight away', () => {
    const r = route({ needsPlacement: () => false })
    routePickedFile(new File([''], 'scan.laz'), r)

    expect(r.onSubmit).toHaveBeenCalledOnce()
    expect(r.onPlace).not.toHaveBeenCalled()
  })

  it('rejects a file outside the accepted types without routing it', () => {
    const r = route({ accept: ['3d-file'] })
    routePickedFile(new File([''], 'notes.pdf'), r)

    expect(r.onReject).toHaveBeenCalledOnce()
    expect(r.onPlace).not.toHaveBeenCalled()
    expect(r.onSubmit).not.toHaveBeenCalled()
  })

  it('accepts a splat when the caller offers models and splats', () => {
    const r = route({ accept: ['3d-file', 'splat-file'] })
    routePickedFile(new File([''], 'scan.spz'), r)

    expect(r.onPlace).toHaveBeenCalledOnce()
    expect(r.onReject).not.toHaveBeenCalled()
  })

  it('accepts everything when the caller names no types', () => {
    const r = route()
    routePickedFile(new File([''], 'notes.pdf'), r)

    expect(r.onReject).not.toHaveBeenCalled()
    expect(r.onPlace).toHaveBeenCalledOnce()
  })
})

describe('acceptAttribute', () => {
  it('joins every accepted type into one input accept string', () => {
    expect(acceptAttribute(['3d-file', 'splat-file'])).toContain('.glb')
    expect(acceptAttribute(['3d-file', 'splat-file'])).toContain('.spz')
  })

  it('offers everything when no types are named', () => {
    expect(acceptAttribute()).toBe('*/*')
  })
})
