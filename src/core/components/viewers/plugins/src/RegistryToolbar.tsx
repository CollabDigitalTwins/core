'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'

import { ToggleGroup, ToggleGroupItem } from '../../../ui/ToggleGroup'

import { RegistryImport } from './RegistryImport'

import type { RegistryActions, RegistryState } from '../types'

export type RegistryScope = 'all' | 'mine'

interface Props {
  registry: RegistryState
  actions: RegistryActions
  scope: RegistryScope
  onScopeChange: (scope: RegistryScope) => void
}

/** Above the registry tab: what the registry is, the Mine filter, and importing a package for platform admins. */
export function RegistryToolbar({ registry, actions, scope, onScopeChange }: Props) {
  const t = useTranslations('PluginRegistry')
  const canPublish = registry.viewer?.canPublish ?? false
  const canGrant = registry.viewer?.canGrant ?? false

  return (
    <div className="mb-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          {canPublish ? t('sectionHint') : t('sectionHintGranted')}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {canGrant && <RegistryImport actions={actions} />}
          {canPublish && (
            <ToggleGroup
              type="single"
              value={scope}
              onValueChange={value => value && onScopeChange(value as RegistryScope)}
              aria-label={t('filterLabel')}
            >
              <ToggleGroupItem value="all" size="sm">{t('filterAll')}</ToggleGroupItem>
              <ToggleGroupItem value="mine" size="sm">{t('filterMine')}</ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </div>

      {registry.error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">{t('errorHeading')}</p>
          <p className="mt-1 text-xs">{registry.error.message}</p>
        </div>
      )}
    </div>
  )
}
