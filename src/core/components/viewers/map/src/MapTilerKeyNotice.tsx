'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button } from '../../../ui/Button'
import { Menubar } from '../../../ui/Menubar'
import { isLocalhostOrigin } from '../utils/mapStyleSpec'

const MAPTILER_KEYS_URL = 'https://cloud.maptiler.com/account/keys/'

/**
 * Shown only where no MapTiler key is configured. Reads the same key the layers are given,
 * so the notice cannot contradict what actually rendered.
 */
export function MapTilerKeyNotice({ maptilerKey }: { maptilerKey?: string }) {
  const t = useTranslations('MapTilerKeyNotice')
  const [dismissed, setDismissed] = React.useState(false)

  const hasKey = Boolean((maptilerKey ?? '').trim())

  // Effect, not render: the server has no hostname and a guess would hydrate mismatched.
  const [isDevHost, setIsDevHost] = React.useState<boolean | null>(null)
  React.useEffect(() => setIsDevHost(isLocalhostOrigin()), [])

  if (hasKey || dismissed || isDevHost === null) return null

  return (
    <div className="pointer-events-auto" role="status" data-testid="maptiler-key-notice">
      <Menubar className="h-auto w-[min(20rem,calc(100vw-1.5rem))] items-start gap-2 p-3">
        <LR.KeyRound size={15} className="mt-0.5 shrink-0 opacity-70" aria-hidden />
        <div className="flex-1 space-y-1">
          <div className="text-sm font-medium leading-snug">
            {isDevHost ? t('devTitle') : t('title')}
          </div>
          <p className="text-xs leading-snug opacity-70">
            {isDevHost ? t('devBody') : t('body')}
          </p>
          <a
            href={MAPTILER_KEYS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 opacity-90 hover:opacity-100"
          >
            {t('cta')}
            <LR.ExternalLink size={11} aria-hidden />
          </a>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          aria-label={t('dismiss')}
          title={t('dismiss')}
          className="h-7 w-7 shrink-0 opacity-70 transition-opacity duration-200 hover:bg-transparent hover:opacity-100"
        >
          <LR.X size={14} />
        </Button>
      </Menubar>
    </div>
  )
}
