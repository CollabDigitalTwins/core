'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ChevronsUpDown, UserRoundGroup } from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '../../../ui/Badge'
import { Button } from '../../../ui/Button'
import { Checkbox } from '../../../ui/Checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../ui/Command'
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/Popover'

import { registryErrorMessage } from './registryErrorMessage'

import type { RegistryActions, RegistryOrganization, RegistryPlugin } from '../types'

interface Props {
  plugin: RegistryPlugin
  actions: RegistryActions
}

const orgLabel = (org: RegistryOrganization) => org.title || org.name

/** Platform-admin only: tick the organizations that may install this plugin. A new grant runs the latest version. */
export function VisibleToPicker({ plugin, actions }: Props) {
  const t = useTranslations('PluginRegistry')
  const tPage = useTranslations('PluginsPage')
  const [open, setOpen] = React.useState(false)
  const [organizations, setOrganizations] = React.useState<RegistryOrganization[] | null>(null)

  React.useEffect(() => {
    if (!open || organizations) return
    let cancelled = false
    actions.listOrganizations()
      .then(rows => !cancelled && setOrganizations(rows))
      .catch(error => toast.error(registryErrorMessage(error)))
    return () => {
      cancelled = true
    }
  }, [open, organizations, actions])

  const grants = plugin.grants ?? []
  const granted = new Set(grants.map(grant => grant.organizationId))

  const toggle = async (org: RegistryOrganization) => {
    const label = orgLabel(org)
    try {
      if (granted.has(org.id)) {
        await actions.revokeGrant(plugin.slug, org.id)
        toast.success(t('toastRevoked', { org: label, name: plugin.name }))
      } else {
        await actions.setGrant(plugin.slug, org.id, null)
        toast.success(t('toastGranted', { org: label, name: plugin.name }))
      }
    } catch (error) {
      toast.error(registryErrorMessage(error))
    }
  }

  const summary = grants.length
    ? grants.map(grant => grant.organizationName).join(', ')
    : tPage('visibleToCount', { count: 0 })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={t('grantTitle', { name: plugin.name })}
          title={summary}
          className="h-8 gap-1 px-1.5 font-normal"
        >
          <Badge variant={grants.length ? 'secondary' : 'outline'} className="gap-1 tabular-nums">
            <UserRoundGroup aria-hidden className="h-3.5 w-3.5" />
            {grants.length}
          </Badge>
          <ChevronsUpDown aria-hidden className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={t('grantSearch')} />
          <CommandList>
            {organizations === null ? (
              <p className="p-3 text-sm text-muted-foreground">{t('grantLoading')}</p>
            ) : (
              <>
                <CommandEmpty>{t('grantNoMatch')}</CommandEmpty>
                <CommandGroup>
                  {organizations.map(org => (
                    <CommandItem key={org.id} value={`${orgLabel(org)} ${org.id}`} onSelect={() => void toggle(org)}>
                      <Checkbox checked={granted.has(org.id)} className="pointer-events-none mr-2" tabIndex={-1} aria-hidden />
                      <span className="truncate">{orgLabel(org)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
