'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import ConfirmDialog from '../../../ConfirmDialog'
import { Badge } from '../../../ui/Badge'
import { Button } from '../../../ui/Button'

import { publishState } from './publishState'
import { RegistryAccessList } from './RegistryAccessList'
import { registryErrorMessage } from './registryErrorMessage'
import { RegistryPublishStrip } from './RegistryPublishStrip'

import type { PluginManifest } from '../../../../plugins/sdk/types'
import type { RegistryActions, RegistryPlugin, RegistryVersion } from '../types'

type Pending = { kind: 'version'; version: string } | { kind: 'plugin' } | null

interface Props {
  /** The registry's copy, when there is one. */
  entry?: RegistryPlugin
  /** The build mounted on this server, when there is one: it can be published. */
  mounted?: PluginManifest
  canGrant: boolean
  actions: RegistryActions
}

/** The registry half of an expanded row: publishing, versions, who has access, and the owner's controls. */
export function RegistryDetails({ entry, mounted, canGrant, actions }: Props) {
  return (
    <section className="flex flex-col gap-3" data-testid={`registry-details-${entry?.slug ?? mounted?.slug}`}>
      {mounted && <MountedPublish manifest={mounted} entry={entry} canGrant={canGrant} actions={actions} />}
      {entry && <RegistryEntry plugin={entry} canGrant={canGrant} actions={actions} />}
    </section>
  )
}

function MountedPublish({
  manifest,
  entry,
  canGrant,
  actions,
}: {
  manifest: PluginManifest
  entry?: RegistryPlugin
  canGrant: boolean
  actions: RegistryActions
}) {
  const t = useTranslations('PluginRegistry')

  const publish = async (): Promise<boolean> => {
    try {
      const { version, claimed } = await actions.publishMounted(manifest.slug)
      toast.success(claimed
        ? t('toastClaimed', { name: manifest.name, version, slug: manifest.slug })
        : t('toastPublished', { name: manifest.name, version }))
      return true
    } catch (error) {
      toast.error(t('toastPublishFailed', { name: manifest.name, message: registryErrorMessage(error) }))
      return false
    }
  }

  return <RegistryPublishStrip manifest={manifest} state={publishState(manifest, entry, canGrant)} onPublish={publish} />
}

function RegistryEntry({ plugin, canGrant, actions }: { plugin: RegistryPlugin; canGrant: boolean; actions: RegistryActions }) {
  const t = useTranslations('PluginRegistry')
  const [pending, setPending] = React.useState<Pending>(null)
  const [busy, setBusy] = React.useState(false)

  const canManage = plugin.ownedByMe || canGrant

  const confirmRemoval = async () => {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.kind === 'version') {
        const { outcome } = await actions.removeVersion(plugin.slug, pending.version)
        toast.success(outcome === 'yanked'
          ? t('toastVersionYanked', { version: pending.version })
          : t('toastVersionDeleted', { version: pending.version }))
      } else {
        await actions.removePlugin(plugin.slug)
        toast.success(t('toastPluginRemoved', { name: plugin.name }))
      }
      setPending(null)
    } catch (error) {
      toast.error(registryErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <LR.Library className="h-4 w-4" />
          <span className="font-medium text-foreground">{t('stripHeading')}</span>
          <span className="opacity-40">·</span>
          {plugin.ownedByMe ? t('ownerYou') : t('owner', { name: plugin.owner.name })}
          {plugin.ownedByMe && <Badge variant="secondary" className="font-normal">{t('ownerYouBadge')}</Badge>}
        </p>

        {canManage && (
          <Button size="sm" variant="ghost" onClick={() => setPending({ kind: 'plugin' })}>
            <LR.Trash className="h-4 w-4" />
            {t('removePlugin')}
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <section>
          <h4 className="mb-2 text-xs text-muted-foreground">{t('versionsHeading')}</h4>
          <ul className="divide-y rounded-xl border">
            {plugin.versions.map(version => (
              <VersionRow
                key={version.version}
                version={version}
                canRemove={canManage && version.status === 'PUBLISHED'}
                onRemove={() => setPending({ kind: 'version', version: version.version })}
              />
            ))}
          </ul>
        </section>

        {canGrant && <RegistryAccessList plugin={plugin} actions={actions} />}
      </div>

      <ConfirmDialog
        isOpen={pending !== null}
        isDeleting={busy}
        onOpenChange={open => !open && !busy && setPending(null)}
        handleConfirm={() => void confirmRemoval()}
        title={pending?.kind === 'version'
          ? t('removeVersionTitle', { name: plugin.name, version: pending.version })
          : t('removePluginTitle', { name: plugin.name })}
        description={pending?.kind === 'version'
          ? t('removeVersionDescription')
          : t('removePluginDescription', { slug: plugin.slug })}
        confirmLabel={t('removeConfirm')}
        cancelLabel={t('cancel')}
      />
    </div>
  )
}

function VersionRow({ version, canRemove, onRemove }: { version: RegistryVersion; canRemove: boolean; onRemove: () => void }) {
  const t = useTranslations('PluginRegistry')
  const retired = version.status === 'YANKED'

  return (
    <li className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
        <span className={retired ? 'tabular-nums text-muted-foreground line-through' : 'tabular-nums'}>v{version.version}</span>
        {retired && <Badge variant="outline" className="font-normal text-muted-foreground">{t('statusYanked')}</Badge>}
        <small className="text-xs text-muted-foreground">
          {t('publishedBy', { name: version.publishedBy, date: new Date(version.publishedAt).toLocaleDateString() })}
        </small>
      </span>
      {canRemove && (
        <Button size="sm" variant="ghost" onClick={onRemove} aria-label={t('removeVersionLabel', { version: version.version })}>
          {t('removeVersion')}
        </Button>
      )}
    </li>
  )
}
