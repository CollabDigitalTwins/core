'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { MAP_COLOUR_PALETTE } from '@collabdt/core/plugins-sdk'
import { Button, Input, Separator } from '@collabdt/core/plugins-sdk/components'
import { useMapViewer } from '@collabdt/core/plugins-sdk/mapViewer'
import { usePluginTranslations } from '@collabdt/core/plugins-sdk/messages'

import { useMarkers } from '../markers'

/** How many palette entries to offer as swatches before the free colour input. */
const SWATCHES = 8

/**
 * The name, saved only when confirmed. Not on blur: with a confirm button, blurring to reach
 * it would save first, and blurring elsewhere would commit an unconfirmed edit.
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

      {/* Laid out like the app's other inline text edits (see the comment editor): the field
          takes the row, then a confirm and a revert, both h-8 w-8 icon buttons. */}
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
          <CheckIcon />
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
          <XIcon />
        </Button>
      </div>
    </div>
  )
}

// Drawn here: `lucide-react` is unshimmed, so a plugin cannot import it.
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function CheckIcon() {
  return <Glyph><path d="M20 6 9 17l-5-5" /></Glyph>
}

function XIcon() {
  return <Glyph><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Glyph>
}

/** Smaller than the button glyphs — it sits inside a 24px swatch, not a 32px button. */
function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

/** Traces lucide's `map-pin-plus`, the same icon the toolbar registration names. */
function MarkerPlusIcon() {
  return (
    <Glyph>
      <path d="M19.914 11.105A7.298 7.298 0 0 0 20 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 1.202 0 32 32 0 0 0 .824-.738" />
      <circle cx="12" cy="10" r="3" />
      <path d="M16 18h6" />
      <path d="M19 15v6" />
    </Glyph>
  )
}

/** The markers in the viewer sidebar, in the map and BIM viewers alike. */
export function MarkersTab() {
  const t = usePluginTranslations()
  const { map } = useMapViewer()
  const {
    markers, isLoading, lastError, selected,
    select, open, add, setColour, rename, remove,
  } = useMarkers()

  const addHere = async () => {
    if (!map) return
    const centre = map.getCenter()
    await add(centre.lat, centre.lng, map.getZoom())
  }

  /** Back to exactly the view the marker was recorded at, zoom included. */
  const flyTo = () => {
    if (!map || !selected) return

    map.flyTo({ center: [selected.longitude, selected.latitude], zoom: selected.zoom })
    open(selected.key)
  }

  if (isLoading && markers.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t('loading', 'Loading…')}</p>
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        disabled={!map}
        onClick={() => { void addHere() }}
      >
        <MarkerPlusIcon />
        {t('addHere', 'Add a marker at the map centre')}
      </Button>

      {!map && (
        <p className="text-xs text-muted-foreground">
          {t('mapOnly', 'Switch to the map to add a marker.')}
        </p>
      )}

      {lastError && (
        <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {t('saveFailed', 'Could not save: ')}{lastError}
        </p>
      )}

      {markers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('empty', 'No markers yet. Record one from the map toolbar.')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {markers.map(marker => (
            <li key={marker.key}>
              <button
                type="button"
                onClick={() => { select(marker.key); open(marker.key) }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm ${
                  selected?.key === marker.key ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 shrink-0 rounded-full border border-white"
                  style={{ backgroundColor: marker.colour }}
                />
                <span className="flex-1 truncate">{marker.name}</span>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {marker.latitude.toFixed(2)}, {marker.longitude.toFixed(2)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

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

          <Button size="sm" variant="outline" disabled={!map} onClick={flyTo}>
            {t('flyTo', 'Fly to on the map')}
          </Button>

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

              {/* Last in the row, set apart by a border and a margin: the palette is the
                  default, not a limit. A plus rather than a swatch — a swatch of the current
                  colour was indistinguishable from the presets beside it. The native input
                  cannot be made round reliably across browsers, so it sits invisible on top. */}
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

          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            onClick={() => { void remove(selected.key) }}
          >
            {t('delete', 'Delete')}
          </Button>
        </>
      )}
    </div>
  )
}
