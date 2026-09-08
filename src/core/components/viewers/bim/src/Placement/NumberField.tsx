'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { Input } from '../../../../ui/Input'

export interface NumberFieldProps {
  label: string
  value: number
  step: number
  min?: number
  className?: string
  onCommit: (value: number) => void
}

/**
 * A number input that can be emptied. It holds what was typed until focus leaves, so clearing the
 * field to retype does not immediately snap a value back in.
 */
export function NumberField({ label, value, step, min, className, onCommit }: NumberFieldProps) {
  const [draft, setDraft] = React.useState<string | null>(null)

  return (
    <Input
      type="number"
      aria-label={label}
      value={draft ?? String(value)}
      step={step}
      min={min}
      className={className}
      onChange={(event) => {
        setDraft(event.target.value)
        const parsed = Number.parseFloat(event.target.value)
        if (Number.isFinite(parsed)) onCommit(parsed)
      }}
      onBlur={() => setDraft(null)}
    />
  )
}
