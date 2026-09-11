// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

'use client'

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { Popup } from 'react-map-gl/maplibre'

import { MapContext } from '../../../../../../store'

export const MapPopupStack = () => {
  const { state: mapState, dispatch: mapDispatch } = React.useContext(MapContext)
  const { popupStack } = mapState.map
  const t = useTranslations('MapPopupStack')

  const close = React.useCallback(
    () => mapDispatch({ type: 'SET_POPUP_STACK', payload: null }),
    [mapDispatch],
  )

  const step = React.useCallback(
    (delta: number) => {
      if (!popupStack) return
      mapDispatch({
        type: 'SET_POPUP_INDEX',
        payload: { activeIndex: popupStack.activeIndex + delta },
      })
    },
    [mapDispatch, popupStack],
  )

  if (!popupStack || popupStack.entries.length === 0) return null

  const { entries, activeIndex } = popupStack
  const active = entries[activeIndex]
  if (!active) return null

  const closeButton = (
    <button
      aria-label={t('close')}
      className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={close}
      type="button"
    >
      <LR.X className="h-4 w-4" />
    </button>
  )

  // Alone the close button floats out of the flow, so a single popup gains no bar or separator.
  const header = entries.length === 1
    ? <div className="relative z-10 h-0 text-right">{closeButton}</div>
    : (
      <div className="-mx-1 -mt-1 mb-1.5 flex items-center gap-1 border-b px-1.5 py-1 text-xs">
        <button
          aria-label={t('previous')}
          className="shrink-0 rounded p-0.5 hover:bg-muted"
          onClick={() => step(-1)}
          type="button"
        >
          <LR.ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center" title={active.title}>
          <span className="font-medium">
            {t('counter', { index: activeIndex + 1, total: entries.length })}
          </span>
          {active.title ? ` · ${active.title}` : ''}
        </span>
        <button
          aria-label={t('next')}
          className="shrink-0 rounded p-0.5 hover:bg-muted"
          onClick={() => step(1)}
          type="button"
        >
          <LR.ChevronRight className="h-4 w-4" />
        </button>
        {closeButton}
      </div>
    )

  return (
    <Popup
      anchor="bottom"
      closeButton={true}
      closeOnClick={false}
      closeOnMove={false}
      focusAfterOpen={true}
      key={active.id}
      latitude={active.coordinates[1]}
      longitude={active.coordinates[0]}
      onClose={close}
    >
      {active.render(header)}
    </Popup>
  )
}
