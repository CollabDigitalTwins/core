"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { parseHex, toHex } from '../../utils/colourUtils'

import { Input } from './Input'

const COMMIT_DELAY_MS = 200

// <input type="color"> accepts only #rrggbb and silently resets anything else.
function pickerValue(colour: string): string {
  const rgb = parseHex(colour)
  return rgb ? toHex(rgb) : '#000000'
}

interface ColourSwatchProps {
  value: string
  onChange: (colour: string) => void
  label: string
}

/** A small native colour picker that reports a colour once dragging pauses, so the map is not restyled on every pixel. */
export function ColourSwatch({ value, onChange, label }: ColourSwatchProps) {
  const [draft, setDraft] = React.useState(value)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = React.useRef<string | null>(null)
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => { onChangeRef.current = onChange }, [onChange])
  React.useEffect(() => setDraft(value), [value])

  const commit = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (pending.current !== null) onChangeRef.current(pending.current)
    pending.current = null
  }, [])
  React.useEffect(() => commit, [commit])

  const handleChange = (colour: string) => {
    setDraft(colour)
    pending.current = colour
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(commit, COMMIT_DELAY_MS)
  }

  return (
    <span className="inline-block h-5 w-5 shrink-0 overflow-hidden rounded-sm border border-gray-300 shadow-sm">
      <Input
        type="color"
        aria-label={label}
        title={label}
        value={pickerValue(draft)}
        onChange={event => handleChange(event.target.value)}
      />
    </span>
  )
}
