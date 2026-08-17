'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePluginBimAppearance, useBimViewer } from '../../sdk/bimViewer'
import { Button, Separator } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'
import { usePluginDialogs } from '../../sdk/ui'
import { toModelIdMap, useSpaces } from '../spaces'

import type { BimToolProps } from '../../sdk/bimViewer'
import type { ToolbarToolProps } from '../../sdk/types'

/**
 * The toolbar panel: what the model contains, and the two actions worth having one click
 * away. Renaming and colouring live in the sidebar tab instead — this panel is a dropdown
 * that closes as soon as you click elsewhere, which is no place for a form.
 */
export function SpacesTool({ modelIds }: ToolbarToolProps & BimToolProps) {
  const t = usePluginTranslations()
  const { select, isolate, showAll, fitToSelection } = useBimViewer()
  const { setAppearance, clearAppearance } = usePluginBimAppearance()
  const { spaces, isLoading, selected } = useSpaces()
  const { open } = usePluginDialogs()

  const selectAll = async () => {
    if (spaces.length === 0) return
    await select(toModelIdMap(spaces))
    await fitToSelection()
  }

  const isolateAll = async () => {
    if (spaces.length === 0) return
    await isolate(toModelIdMap(spaces))
    await fitToSelection()
  }

  const paintAll = () => {
    for (const space of spaces) {
      setAppearance(toModelIdMap([space]), {
        color: Number.parseInt(space.colour.replace('#', ''), 16),
      })
    }
  }

  return (
    <div className="w-64 p-1">
      <p className="px-2 py-1 text-sm font-medium">{t('title', 'Spaces')}</p>
      <Separator className="my-1" />

      {modelIds.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('noModel', 'Load a model to see its spaces.')}
        </p>
      ) : isLoading && spaces.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('loading', 'Reading the model…')}
        </p>
      ) : (
        <>
          <p className="px-2 py-1 text-sm text-muted-foreground">
            {t('count', 'Spaces: ')}{spaces.length}
          </p>

          <Separator className="my-1" />

          <Item label={t('selectAll', 'Select them all')} onClick={() => { void selectAll() }} />
          <Item label={t('isolateAll', 'Isolate them')} onClick={() => { void isolateAll() }} />
          <Item label={t('paintAll', 'Colour the spaces')} onClick={paintAll} />
          <Item label={t('clearPaint', 'Reset the colours')} onClick={clearAppearance} />
          <Item label={t('showAll', 'Show everything again')} onClick={() => { void showAll() }} />

          {selected && (
            <>
              <Separator className="my-1" />
              <Item
                label={t('detailsFor', 'Details: ') + selected.name}
                onClick={() => open('detail', { spaceKey: selected.key })}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

function Item({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="w-full justify-start truncate font-normal"
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
