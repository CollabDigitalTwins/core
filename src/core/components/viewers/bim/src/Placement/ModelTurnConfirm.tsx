'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import ConfirmDialog from '../../../../ConfirmDialog'
import { ModelPlacementWatchers } from '../lib/modelPlacementWatchers'

import type { TurnConfirmRequest } from '../lib/modelPlacementWatchers'
import type * as OBC from '@thatopen/components'

interface PendingTurn extends TurnConfirmRequest {
  resolve: (proceed: boolean) => void
}

/** Asks before a model turns while plugins keep data on it, such as planned spaces. */
export function ModelTurnConfirm({ components }: { components: OBC.Components | null }) {
  const t = useTranslations('Placement')
  const [pending, setPending] = React.useState<PendingTurn | null>(null)
  const pendingRef = React.useRef<PendingTurn | null>(null)

  const show = React.useCallback((next: PendingTurn | null) => {
    pendingRef.current?.resolve(false)
    pendingRef.current = next
    setPending(next)
  }, [])

  React.useEffect(() => {
    if (!components) return
    const watchers = components.get(ModelPlacementWatchers)
    watchers.setTurnConfirmer(request => new Promise<boolean>(resolve => show({ ...request, resolve })))
    return () => {
      watchers.setTurnConfirmer(null)
      show(null)
    }
  }, [components, show])

  const settle = (proceed: boolean) => {
    pendingRef.current?.resolve(proceed)
    pendingRef.current = null
    setPending(null)
  }

  return (
    <ConfirmDialog
      isOpen={pending !== null}
      tone="default"
      onOpenChange={(open: boolean) => { if (!open) settle(false) }}
      handleConfirm={() => settle(true)}
      title={t('turnModelTitle', { name: pending?.modelName ?? '' })}
      description={(
        <>
          {t('turnModelBody')}
          {pending?.warnings.map(warning => <span key={warning} className="mt-2 block">• {warning}</span>)}
        </>
      )}
      confirmLabel={t('turnModelConfirm')}
    />
  )
}
