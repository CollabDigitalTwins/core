'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Button } from '../../sdk/components'
import { usePluginTranslations } from '../../sdk/messages'
import { usePicks } from '../picks'

interface Props {
  close: () => void
  /** Supplied by whichever surface opened this — the sidebar tab, or a row on the page. */
  pickKey?: string
}

/**
 * The dialog. Core owns the overlay, the title bar, the focus trap and Escape; this renders
 * the body and calls `close` when it is done.
 *
 * It outlives whatever opened it: closing the map tool's panel leaves this on screen.
 */
export function PickDialog({ close, pickKey }: Props) {
  const t = usePluginTranslations()
  const { picks, selected } = usePicks()

  const pick = pickKey ? picks.find(candidate => candidate.key === pickKey) ?? null : selected

  return (
    <div className="flex flex-col gap-4">
      {pick ? (
        <dl className="text-sm">
          <Row label={t('columnName', 'Point')} value={pick.name} />
          <Row label={t('columnLatitude', 'Latitude')} value={pick.latitude.toFixed(5)} />
          <Row label={t('columnLongitude', 'Longitude')} value={pick.longitude.toFixed(5)} />
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('nothingSelected', 'Nothing picked yet. Use the Pick a point tool on the map.')}
        </p>
      )}

      <Button className="self-end" onClick={close}>{t('close', 'Close')}</Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
