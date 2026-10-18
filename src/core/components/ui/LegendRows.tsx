'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

/** One legend line; a string swatch is drawn as a plain colour square. */
export interface LegendRowEntry {
  label: string
  /** Shown instead of the label text, which then only names the row for assistive tech. */
  labelContent?: React.ReactNode
  swatch: React.ReactNode | string
  trailing?: React.ReactNode
  dimmed?: boolean
}

export interface LegendRowsProps {
  rows: LegendRowEntry[]
  limit?: number
  moreLabel?: (hidden: number) => string
  'aria-label'?: string
  className?: string
  labelClassName?: string
}

function Swatch({ swatch }: { swatch: LegendRowEntry['swatch'] }) {
  if (typeof swatch !== 'string') return swatch
  return <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: swatch }} />
}

/** A legend list of swatch-and-label rows; past `limit` rows, a "+N more" line from `moreLabel` stands for the rest. */
export function LegendRows({ rows, limit, moreLabel, 'aria-label': ariaLabel, className = 'flex flex-col gap-1 text-xs', labelClassName = 'truncate' }: LegendRowsProps) {
  const shown = limit === undefined ? rows : rows.slice(0, limit)
  const hidden = rows.length - shown.length
  return (
    <>
      <ul aria-label={ariaLabel} className={className}>
        {shown.map((row, i) => (
          <li key={`${row.label}-${i}`} className={row.dimmed ? 'flex items-center gap-2 opacity-50' : 'flex items-center gap-2'}>
            <Swatch swatch={row.swatch} />
            {row.labelContent ?? <span className={labelClassName} title={row.label}>{row.label}</span>}
            {row.trailing}
          </li>
        ))}
      </ul>
      {hidden > 0 && moreLabel && <p className="text-xs text-muted-foreground">{moreLabel(hidden)}</p>}
    </>
  )
}
