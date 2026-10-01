'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '../../../ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/Select'

import { registryErrorMessage } from './registryErrorMessage'
import { VisibleToPicker } from './VisibleToPicker'

import type { RegistryActions, RegistryGrant, RegistryPlugin } from '../types'

const LATEST = '__latest__'

interface Props {
  plugin: RegistryPlugin
  actions: RegistryActions
}

/** Platform-admin only: the organizations with access and the version each one runs. */
export function RegistryAccessList({ plugin, actions }: Props) {
  const t = useTranslations('PluginRegistry')
  const grants = plugin.grants ?? []
  const published = plugin.versions.filter(version => version.status === 'PUBLISHED').map(version => version.version)

  const apply = async (work: () => Promise<void>, success: string) => {
    try {
      await work()
      toast.success(success)
    } catch (error) {
      toast.error(registryErrorMessage(error))
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs text-muted-foreground">{t('accessHeading')}</h4>
        <VisibleToPicker plugin={plugin} actions={actions} />
      </div>
      {grants.length ? (
        <ul className="divide-y rounded-xl border">
          {grants.map(grant => (
            <GrantRow
              key={grant.organizationId}
              grant={grant}
              versions={published}
              onPin={pinnedVersion => void apply(
                () => actions.setGrant(plugin.slug, grant.organizationId, pinnedVersion),
                pinnedVersion
                  ? t('toastPinned', { org: grant.organizationName, version: pinnedVersion })
                  : t('toastFollowLatest', { org: grant.organizationName }),
              )}
              onRevoke={() => void apply(
                () => actions.revokeGrant(plugin.slug, grant.organizationId),
                t('toastRevoked', { org: grant.organizationName, name: plugin.name }),
              )}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('accessNone')}</p>
      )}
    </section>
  )
}

function GrantRow({
  grant,
  versions,
  onPin,
  onRevoke,
}: {
  grant: RegistryGrant
  versions: string[]
  onPin: (pinnedVersion: string | null) => void
  onRevoke: () => void
}) {
  const t = useTranslations('PluginRegistry')

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm">{grant.organizationName}</span>
        <small className="text-xs text-muted-foreground">
          {grant.resolvedVersion ? t('grantResolved', { version: grant.resolvedVersion }) : t('grantNoVersion')}
        </small>
      </span>

      <span className="flex items-center gap-1">
        <Select
          value={grant.pinnedVersion ?? LATEST}
          onValueChange={value => onPin(value === LATEST ? null : value)}
        >
          <SelectTrigger className="h-8 w-36" aria-label={t('grantPinFor', { org: grant.organizationName })}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LATEST}>{t('grantPinLatest')}</SelectItem>
            {versions.map(version => (
              <SelectItem key={version} value={version}>{t('grantPinned', { version })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onRevoke}
          aria-label={t('grantRevokeFor', { org: grant.organizationName })}
        >
          <LR.X className="h-4 w-4" />
        </Button>
      </span>
    </li>
  )
}
