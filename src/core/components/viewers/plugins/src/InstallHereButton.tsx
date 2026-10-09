'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '../../../ui/Button'

import { registryErrorMessage } from './registryErrorMessage'

import type { RegistryActions } from '../types'

/** Shares a registry plugin with the viewer's organization and switches it on, in one click. */
export function InstallHereButton({ slug, name, actions }: { slug: string; name: string; actions: RegistryActions }) {
  const t = useTranslations('PluginsPage')
  const [busy, setBusy] = React.useState(false)

  const install = async () => {
    setBusy(true)
    try {
      await actions.installHere(slug)
      toast.success(t('toastInstalledHere', { name }))
    } catch (error) {
      toast.error(t('toastInstallHereFailed', { name, message: registryErrorMessage(error) }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button size="sm" disabled={busy} onClick={() => void install()}>
      <LR.Download className="h-4 w-4" />
      {t('installHere')}
    </Button>
  )
}
