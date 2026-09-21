'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import ConfirmDialog from '../../../../ConfirmDialog'

export interface BuildingLinkConfirm {
  /** Resolves true when the file should be attached to the building it landed on. */
  confirmLink: (buildingName: string, fileName: string) => Promise<boolean>
  dialog: React.ReactNode
}

/** A placement that lands on a building attaches the file to it, once the user has agreed. */
export function useBuildingLinkConfirm(): BuildingLinkConfirm {
  const t = useTranslations('Placement')
  const [asking, setAsking] = React.useState<{ building: string, file: string } | null>(null)
  const answer = React.useRef<((linked: boolean) => void) | null>(null)

  const settle = React.useCallback((linked: boolean) => {
    answer.current?.(linked)
    answer.current = null
    setAsking(null)
  }, [])

  const confirmLink = React.useCallback((buildingName: string, fileName: string) => {
    setAsking({ building: buildingName, file: fileName })
    return new Promise<boolean>((resolve) => { answer.current = resolve })
  }, [])

  const dialog = asking === null ? null : (
    <ConfirmDialog
      isOpen
      isDeleting={false}
      tone="default"
      title={t('linkBuildingTitle')}
      description={t('linkBuildingBody', { building: asking.building, file: asking.file })}
      confirmLabel={t('linkBuildingConfirm')}
      cancelLabel={t('linkBuildingCancel')}
      onOpenChange={(open: boolean) => { if (!open) settle(false) }}
      handleConfirm={() => settle(true)}
    />
  )

  return { confirmLink, dialog }
}
