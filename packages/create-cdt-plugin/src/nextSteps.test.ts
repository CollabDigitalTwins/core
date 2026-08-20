// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import { externalNextSteps } from './nextSteps'

const steps = (overrides: Partial<Parameters<typeof externalNextSteps>[0]> = {}) =>
  externalNextSteps({
    where: 'plugins\\ids-checker',
    pluginsDir: 'C:\\CollabDigitalTwins\\cdt-selfhosted\\plugins',
    surfaces: ['bim.tools', 'viewer.tabs'],
    ...overrides,
  })

describe('externalNextSteps', () => {
  // Windows PowerShell 5.1 rejects `&&` as a statement separator, and it is the default shell
  // on the platform most self-hosters run. A joined command line is unpastable there.
  it('never joins commands with &&', () => {
    expect(steps()).not.toContain('&&')
  })

  it('never joins commands with a semicolon, which would build after a failed install', () => {
    expect(steps()).not.toContain('npm install;')
  })

  it('puts each command on its own line, in build order', () => {
    const lines = steps().split('\n').map(line => line.trim())
    const cd = lines.indexOf('cd plugins/ids-checker')

    expect(cd).toBeGreaterThan(-1)
    expect(lines[cd + 1]).toBe('npm install')
    expect(lines[cd + 2]).toBe('npm run build')
  })

  // A backslash is an escape in a POSIX shell, so `cd plugins\ids-checker` reaches
  // `pluginsids-checker`. Windows reads a forward slash fine, so one form serves both.
  it('writes paths with forward slashes', () => {
    const text = steps()

    expect(text).toContain('cd plugins/ids-checker')
    expect(text).toContain('PLUGINS_DIR=C:/CollabDigitalTwins/cdt-selfhosted/plugins')
    expect(text).not.toMatch(/\\/)
  })

  it('leads with the build, which is the step that silently costs an afternoon', () => {
    expect(steps().split('\n')[0]).toMatch(/build it/i)
  })

  it('names the env vars a mounted plugin needs', () => {
    const text = steps()

    expect(text).toContain('PLUGINS_ENABLED=true')
    expect(text).toContain('PLUGINS_DEV=true')
  })

  it('names where to look, from the surfaces that were scaffolded', () => {
    expect(steps()).toContain('Look for it in: BIM toolbar, Viewer sidebar tab')
  })

  it('follows the chosen surfaces rather than hardcoding a viewer', () => {
    expect(steps({ surfaces: ['map.layers'] })).toContain('Look for it in: Map layer')
  })

  it('mentions the Docker case, where the build has to run on the host', () => {
    expect(steps()).toMatch(/Docker/)
  })

  it('handles being run from inside the plugins folder, where `where` is just the slug', () => {
    expect(steps({ where: 'ids-checker' })).toContain('cd ids-checker')
  })
})
