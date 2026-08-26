'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Button, Separator } from '@collabdt/core/plugins-sdk/components'
import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'

import { toModelIdMap, useSpacePainting, useSpaces } from '../spaces'

import type { BimToolProps, ToolbarToolProps } from '@collabdt/plugin-kit/types/bim'

/**
 * Three things worth one click. Renaming and colouring live in the sidebar tab: this panel is
 * a dropdown that closes on the next click. The viewer arrives as props, as the host intends.
 */
export function SpacesTool({
  modelIds,
  isolate,
  setItemsVisible,
  showAll,
  fitToSelection,
  select,
}: ToolbarToolProps & BimToolProps) {
  const t = usePluginTranslations()
  const { spaces, isLoading } = useSpaces()
  const { painted, setPainted } = useSpacePainting()

  const items = () => toModelIdMap(spaces)

  const isolateSpaces = async () => {
    if (spaces.length === 0) return

    await setItemsVisible(items(), true)
    await isolate(items())
    await select(items())
    await fitToSelection()
  }

  const reset = async () => {
    setPainted(false)
    await showAll()
  }

  return (
    <div className="w-60 p-1">
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
      ) : spaces.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {t('empty', 'This model has no IfcSpaces.')}
        </p>
      ) : (
        <>
          <p className="px-2 pb-1 text-xs text-muted-foreground">
            {t('count', 'Spaces in this model: ')}{spaces.length}
          </p>

          <Item
            label={painted ? t('clearColours', 'Clear colours') : t('colourSpaces', 'Colour the spaces')}
            onClick={() => setPainted(current => !current)}
          />
          <Item label={t('isolateSpaces', 'Isolate spaces')} onClick={() => { void isolateSpaces() }} />
          <Item label={t('resetView', 'Reset the view')} onClick={() => { void reset() }} />
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
