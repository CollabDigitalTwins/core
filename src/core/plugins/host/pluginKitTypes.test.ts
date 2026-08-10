// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { VALID_CAPABILITIES } from '../sdk/types'
import { PLUGIN_HOST_API } from '../sdk/version'

const KIT_TYPES = join(process.cwd(), 'packages/plugin-kit/src/types')

const read = (file: string) => readFileSync(join(KIT_TYPES, file), 'utf8')

describe('@collabdt/plugin-kit types', () => {
  it('declares the same host API version core enforces', () => {
    expect(read('base.ts')).toContain(`PLUGIN_HOST_API = ${PLUGIN_HOST_API}`)
  })

  it('lists exactly the capabilities core renders', () => {
    const base = read('base.ts')

    for (const capability of VALID_CAPABILITIES) {
      expect(base).toContain(`'${capability}'`)
    }
  })

  it('keeps the heavy viewer types out of the shared base', () => {
    const base = read('base.ts')

    expect(base).not.toContain('@thatopen/components')
    expect(base).not.toContain('maplibre-gl')
  })

  it('narrows icon to a string so a plugin never needs lucide-react', () => {
    const base = read('base.ts')

    expect(base).toContain('icon: string')
    expect(base).not.toContain('LucideProps')
    expect(base).not.toContain('lucide-react')
  })

  it('confines each viewer library to its own surface file', () => {
    expect(read('map.ts')).toContain('maplibre-gl')
    expect(read('map.ts')).not.toContain('@thatopen/components')

    expect(read('bim.ts')).toContain('@thatopen/components')
    expect(read('bim.ts')).not.toContain('maplibre-gl')

    expect(read('pointcloud.ts')).not.toContain('@thatopen/components')
    expect(read('pointcloud.ts')).not.toContain('maplibre-gl')

    expect(read('legend.ts')).not.toContain('@thatopen/components')
    expect(read('legend.ts')).not.toContain('maplibre-gl')
  })
})
