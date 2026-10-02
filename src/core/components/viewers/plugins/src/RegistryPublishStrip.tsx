'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import ConfirmDialog from '../../../ConfirmDialog'
import { Button } from '../../../ui/Button'

import type { PublishState } from './publishState'
import type { PluginManifest } from '../../../../plugins/sdk/types'

interface Props {
  manifest: PluginManifest
  state: PublishState
  /** Resolves true once published; the caller reports failures. */
  onPublish: () => Promise<boolean>
  onExport: () => void
}

/** Publish a mounted build to the registry, or say why this build cannot be; either way it can be exported. */
export function RegistryPublishStrip({ manifest, state, onPublish, onExport }: Props) {
  const t = useTranslations('PluginRegistry')
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const canPublish = state.kind === 'unpublished' || state.kind === 'update'
  const hint = {
    unpublished: t('hintUnpublished', { slug: manifest.slug }),
    update: state.kind === 'update' ? t('hintUpdate', { version: state.registryVersion }) : '',
    alreadyPublished: t('hintAlreadyPublished', { version: manifest.version }),
    behind: state.kind === 'behind' ? t('hintBehind', { version: state.registryVersion }) : '',
    taken: state.kind === 'taken' ? t('hintTaken', { slug: manifest.slug, owner: state.ownerName }) : '',
  }[state.kind]

  const confirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    setBusy(true)
    const published = await onPublish()
    setBusy(false)
    if (published) setOpen(false)
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-600/30 bg-violet-600/5 p-3"
      data-testid={`registry-strip-${manifest.slug}`}
    >
      <p className="flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
        {state.kind === 'taken'
          ? <LR.TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          : <LR.CloudUpload className="mt-0.5 h-4 w-4 shrink-0" />}
        <span>
          <span className="font-medium text-foreground">{t('stripHeading')}</span>
          <span className="mx-1.5 opacity-40">·</span>
          {hint}
        </span>
      </p>

      <span className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onExport} aria-label={t('exportPackageLabel', { version: manifest.version })}>
          <LR.FileDown className="h-4 w-4" />
          {t('exportPackage')}
        </Button>
        {canPublish && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <LR.CloudUpload className="h-4 w-4" />
            {state.kind === 'update' ? t('publishUpdate', { version: manifest.version }) : t('publishFirst')}
          </Button>
        )}
      </span>

      <ConfirmDialog
        isOpen={open}
        isDeleting={busy}
        onOpenChange={next => !busy && setOpen(next)}
        handleConfirm={confirm}
        title={t('publishTitle', { name: manifest.name, version: manifest.version })}
        description={t('publishDescription')}
        confirmLabel={t('publishConfirm')}
        cancelLabel={t('cancel')}
        tone="default"
      />
    </div>
  )
}
