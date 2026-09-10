// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { describe, expect, it } from 'vitest'

import en from './messages/en.json'
import es from './messages/es.json'
import fr from './messages/fr.json'

const keysOf = (namespace: Record<string, unknown>) => Object.keys(namespace).sort()

describe('message catalogues', () => {
  it('gives every locale the new Upload namespace', () => {
    for (const [name, locale] of [['es', es], ['fr', fr]] as const) {
      expect(keysOf((locale as never)['Upload']), name).toEqual(keysOf((en as never)['Upload']))
    }
  })

  it('gives every locale the new BimSection namespace', () => {
    for (const [name, locale] of [['es', es], ['fr', fr]] as const) {
      expect(keysOf((locale as never)['BimSection']), name).toEqual(keysOf((en as never)['BimSection']))
    }
  })
})
