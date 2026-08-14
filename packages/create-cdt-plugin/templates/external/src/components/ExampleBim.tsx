'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Button, Separator } from '@collabdt/core/plugins-sdk/components'
import { usePluginConfig } from '@collabdt/core/plugins-sdk/config'
import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'
import { useState } from 'react'

import { ReadoutRow } from './ReadoutRow'

import type { BimToolProps, ModelIdMap, ToolbarToolProps } from '{{SURFACE_ENTRY}}'

interface Config extends Record<string, unknown> {
  category?: string
}

// Everything here arrives as props. This component never imports `@thatopen/components` as
// a value and never touches three.js: a second copy of either breaks the viewer, which is
// why the build refuses a bundle containing them.
//
// The visibility step is the trap in this surface. `IFCSPACE` elements start hidden because
// they are volumetric and would obscure everything inside them, so listing spaces is not
// the same as showing them. An author hits this immediately, so the example handles it.
export function {{COMPONENT}}({
  modelIds,
  selection,
  select,
  fitToSelection,
  setItemsVisible,
  getItemsOfCategory,
}: ToolbarToolProps & BimToolProps) {
  const t = usePluginTranslations()
  const { category = 'IFCSPACE' } = usePluginConfig<Config>()

  const [items, setItems] = useState<ModelIdMap>({})
  const [loading, setLoading] = useState(false)

  const found = Object.values(items).reduce((total, ids) => total + ids.size, 0)
  const selected = Object.values(selection).reduce((total, ids) => total + ids.size, 0)

  const load = async () => {
    setLoading(true)
    try {
      const matches = await getItemsOfCategory(category)
      setItems(matches)
      // Listing is not showing. Without this the count is right and the viewport is empty.
      await setItemsVisible(matches, true)
    } finally {
      setLoading(false)
    }
  }

  const reveal = async () => {
    await select(items)
    await fitToSelection()
  }

  return (
    <div className="w-64 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('title', '{{NAME}}')}</p>
      <Separator className="my-1" />

      <dl className="px-2 py-1 text-sm">
        <ReadoutRow label={t('models', 'Models loaded')} value={String(modelIds.length)} />
        <ReadoutRow label={t('category', 'Category')} value={category} />
        <ReadoutRow label={t('found', 'Found')} value={String(found)} />
        <ReadoutRow label={t('selected', 'Selected')} value={String(selected)} />
      </dl>

      <Button
        size="sm"
        variant="ghost"
        className="mt-1 w-full justify-start font-normal"
        disabled={loading || modelIds.length === 0}
        onClick={() => void load()}
      >
        {loading ? t('loading', 'Loading…') : t('load', 'Find and show them')}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="w-full justify-start font-normal"
        disabled={found === 0}
        onClick={() => void reveal()}
      >
        {t('reveal', 'Select and frame')}
      </Button>
    </div>
  )
}
