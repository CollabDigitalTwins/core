'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { MAP_COLOUR_PALETTE } from '../../sdk'
import { useBimViewer } from '../../sdk/bimViewer'
import { Button, Input, Separator } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'
import { usePluginDialogs } from '../../sdk/ui'
import { toModelIdMap, useSpacePainting, useSpaces } from '../spaces'

import { CheckIcon, Glyph, PlusIcon, XIcon } from './icons'

/** How many palette entries to offer as swatches before the free colour input. */
const SWATCHES = 8

/** The spaces in the BIM sidebar. Renaming and colouring live here, not in the dropdown. */
export function SpacesTab() {
  const t = usePluginTranslations()
  const { select, isolate, showAll, fitToSelection, setItemsVisible } = useBimViewer()
  const { spaces, isLoading, lastError, selected, select: choose, rename, setColour, reset } = useSpaces()
  const { open: openDialog } = usePluginDialogs()
  const { painted, setPainted } = useSpacePainting()

  const showOnly = async (key: string) => {
    const space = spaces.find(candidate => candidate.key === key)
    if (!space) return

    const items = toModelIdMap([space])
    await setItemsVisible(items, true)
    await isolate(items)
    await select(items)
    await fitToSelection()
  }

  if (isLoading && spaces.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t('loading', 'Reading the model…')}</p>
  }

  if (spaces.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {t('empty', 'This model has no IfcSpaces.')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={painted ? 'default' : 'outline'}
          aria-pressed={painted}
          className="flex-1"
          onClick={() => setPainted(current => !current)}
        >
          {painted ? t('clearColours', 'Clear colours') : t('colourSpaces', 'Colour the spaces')}
        </Button>
      </div>

      <Button size="sm" variant="outline" onClick={() => { void showAll() }}>
        {t('showAllElements', 'Show all elements')}
      </Button>

      {lastError && (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {t('saveFailed', 'Could not save: ')}{lastError}
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {spaces.map(space => (
          <li key={space.key}>
            <button
              type="button"
              onClick={() => { choose(space.key); void select(toModelIdMap([space])) }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm ${
                selected?.key === space.key ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-white"
                style={{ backgroundColor: space.colour }}
              />
              <span className="flex-1 truncate">{space.name}</span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <>
          <Separator />

          <NameField
            key={selected.key}
            name={selected.name}
            label={t('nameLabel', 'Name')}
            saveLabel={t('saveName', 'Save name')}
            revertLabel={t('revertName', 'Discard the change')}
            onCommit={name => { void rename(selected.key, name) }}
          />

          <p className="text-xs text-muted-foreground">
            {t('ifcName', 'In the model: ')}{selected.ifcName}
          </p>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">{t('colour', 'Colour')}</p>

            <div className="flex flex-wrap items-center gap-1">
              {MAP_COLOUR_PALETTE.slice(0, SWATCHES).map(colour => (
                <button
                  key={colour}
                  type="button"
                  aria-label={colour}
                  aria-pressed={selected.colour === colour}
                  onClick={() => { void setColour(selected.key, colour) }}
                  className={`h-6 w-6 rounded-full border-2 ${
                    selected.colour === colour ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: colour }}
                />
              ))}

              <label
                title={t('customColour', 'Pick any colour')}
                className="relative ml-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input bg-background text-muted-foreground hover:text-foreground"
              >
                <PlusIcon />
                <input
                  type="color"
                  value={selected.colour}
                  onChange={event => { void setColour(selected.key, event.target.value) }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="sr-only">{t('customColour', 'Pick any colour')}</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => { void showOnly(selected.key) }}>
              {t('isolateSpace', 'Isolate space')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => openDialog('detail', { spaceKey: selected.key })}>
              {t('details', 'Details')}
            </Button>
          </div>

          {selected.annotated && (
            <Button size="sm" variant="ghost" className="self-start" onClick={() => { void reset(selected.key) }}>
              {t('reset', 'Reset to the model\'s name and colour')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

/**
 * The name, edited locally and saved only when confirmed. Laid out like the app's other
 * inline text edits: the field takes the row, then a confirm and a revert.
 */
function NameField({
  name,
  label,
  saveLabel,
  revertLabel,
  onCommit,
}: {
  name: string
  label: string
  saveLabel: string
  revertLabel: string
  onCommit: (name: string) => void
}) {
  const [draft, setDraft] = React.useState(name)
  const inputId = React.useId()

  const trimmed = draft.trim()
  const canSave = trimmed.length > 0 && trimmed !== name

  const commit = () => {
    if (!canSave) return
    onCommit(trimmed)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" htmlFor={inputId}>{label}</label>

      <div className="flex items-center gap-1">
        <Input
          id={inputId}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') { event.preventDefault(); commit() }
            if (event.key === 'Escape') setDraft(name)
          }}
          className="h-8 flex-1"
        />

        <Button
          size="icon"
          className="h-8 w-8 shrink-0 p-0"
          disabled={!canSave}
          aria-label={saveLabel}
          title={saveLabel}
          onClick={commit}
        >
          <Glyph><CheckIcon /></Glyph>
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 p-0"
          disabled={!canSave}
          aria-label={revertLabel}
          title={revertLabel}
          onClick={() => setDraft(name)}
        >
          <Glyph><XIcon /></Glyph>
        </Button>
      </div>
    </div>
  )
}
