// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { fitColumns } from './pluginColumns'

import type { PluginColumn } from './pluginColumns'

/** Matches the rows' `px-3`. */
const ROW_PADDING_REM = 1.5

function remInPx(): number {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
}

/** The columns that fit the measured table; attach the returned ref to the element whose width rows share. */
export function useFittedColumns(columns: readonly PluginColumn[]): [React.RefCallback<HTMLElement>, PluginColumn[]] {
  const [element, setElement] = React.useState<HTMLElement | null>(null)
  const [widthPx, setWidthPx] = React.useState(0)

  React.useEffect(() => {
    if (!element) return
    setWidthPx(element.clientWidth)
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => setWidthPx(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  const fitted = React.useMemo(
    () => (widthPx > 0 ? fitColumns(columns, widthPx / remInPx() - ROW_PADDING_REM) : [...columns]),
    [columns, widthPx],
  )
  return [setElement, fitted]
}
