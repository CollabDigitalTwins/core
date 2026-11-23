// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { toQueryString } from '../../map/utils/urlLocation/locationParams'
import { presentLevels } from '../../map/utils/urlLocation/locationTarget'

export interface LastView {
  viewer: 'map' | 'bim'
  url: string
  savedAt: number
}

export const LAST_VIEW_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

const storageKey = (scope: string) => `cdt:lastView:${scope}`

/** Browser storage can be blocked or full; losing a last view is never worth an error. */
export function saveLastView(scope: string, view: Omit<LastView, 'savedAt'>, now = Date.now()): void {
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify({ ...view, savedAt: now }))
  }
  catch { /* storage unavailable */ }
}

export function readLastView(scope: string, now = Date.now()): LastView | null {
  try {
    const view = JSON.parse(window.localStorage.getItem(storageKey(scope)) ?? 'null') as Partial<LastView> | null
    if (!isLastView(view) || now - view.savedAt > LAST_VIEW_MAX_AGE_MS) return null
    return view
  }
  catch {
    return null
  }
}

/** Whether the URL already names a place or camera, in which case it wins over any remembered view. */
export function namesALocation(params: URLSearchParams): boolean {
  return presentLevels(params).length > 0 || params.has('camX')
}

/** Saves the current page, with `params` as its query, as the user's last view in `viewer`. */
export function rememberView(scope: string, viewer: LastView['viewer'], params: URLSearchParams): void {
  const query = new URLSearchParams(params)
  query.set('viewer', viewer)
  saveLastView(scope, { viewer, url: `${window.location.pathname}?${toQueryString(query)}` })
}

function isLastView(value: Partial<LastView> | null): value is LastView {
  return !!value
    && (value.viewer === 'map' || value.viewer === 'bim')
    && typeof value.url === 'string' && value.url.startsWith('/') && !value.url.startsWith('//')
    && typeof value.savedAt === 'number'
}
