'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { resolvePluginIcon } from '../../../../plugins/host/pluginIcon'
import { usePluginMessage } from '../../../../plugins/sdk/messages'
import { cn } from '../../../../utils/utils'
import { Badge } from '../../../ui/Badge'

import { gridTemplate } from './pluginColumns'

import type { ControlColumn, PluginColumn } from './pluginColumns'
import type { RegistryStanding } from './pluginRows'
import type { PluginStatus } from '../types'
import type { LucideIcon } from 'lucide-react'

/** Shared by the header and every row, so the columns line up. */
export const PLUGIN_ROW_GRID = 'grid items-center gap-3'

export function pluginRowStyle(columns: readonly PluginColumn[]): React.CSSProperties {
  return { gridTemplateColumns: gridTemplate(columns) }
}

// Icon and colour both, so status survives a quick scan and colour-blindness.
const STATUS_STYLE: Record<PluginStatus, { icon: LucideIcon; className: string }> = {
  running: {
    icon: LR.CheckCircle2,
    className: 'border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400',
  },
  off: {
    icon: LR.CircleSlash,
    className: 'border-muted-foreground/40 bg-muted text-muted-foreground',
  },
  error: {
    icon: LR.AlertTriangle,
    className: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  available: {
    icon: LR.PackagePlus,
    className: 'border-sky-600/40 bg-sky-600/10 text-sky-700 dark:text-sky-400',
  },
}

interface Props {
  slug: string
  name: string
  icon?: string | null
  version: string | null
  /** Absent for a registry plugin this organization has no copy of. */
  status?: PluginStatus
  standing: RegistryStanding | null
  columns: readonly PluginColumn[]
  /** The quick controls shown while collapsed, one per control column on screen. */
  cells: Partial<Record<ControlColumn, React.ReactNode>>
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/** One plugin as a table row; the details only mount once it is expanded. */
export function PluginRow({ slug, name, icon, version, status, standing, columns, cells, open, onOpenChange, children }: Props) {
  const t = useTranslations('PluginsPage')
  const detailsId = React.useId()
  const Icon = resolvePluginIcon(icon ?? 'Puzzle')
  const label = usePluginMessage(slug, 'name', name)
  const running = status === 'running'

  const cell = (column: PluginColumn) => {
    switch (column) {
      case 'name': return null
      case 'version': return <span key={column} className="truncate tabular-nums text-muted-foreground">{version ? `v${version}` : '—'}</span>
      case 'status': return <span key={column} className="min-w-0">{status ? <StatusBadge status={status} /> : <Dash />}</span>
      case 'registry': return <span key={column} className="min-w-0">{standing ? <RegistryBadge standing={standing} version={version} /> : <Dash />}</span>
      default: return <span key={column} className="flex min-w-0 items-center gap-1.5">{cells[column] ?? <Dash />}</span>
    }
  }

  return (
    <li className="border-b last:border-b-0" data-testid={`plugin-${slug}`}>
      <div className={cn(PLUGIN_ROW_GRID, 'px-3 py-2.5 text-sm hover:bg-muted/40')} style={pluginRowStyle(columns)}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={open}
            aria-controls={detailsId}
            aria-label={t('toggleDetails', { name: label })}
            onClick={() => onOpenChange(!open)}
          >
            <LR.ChevronRight aria-hidden className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
            <Icon
              aria-hidden
              className={cn('h-4 w-4 shrink-0', running ? 'text-foreground' : 'text-muted-foreground')}
              data-testid={`plugin-icon-${slug}`}
            />
            <span className={cn('truncate hover:underline', running ? 'font-semibold text-foreground' : 'text-foreground/80')}>{label}</span>
          </button>
          <code className="hidden truncate text-xs text-muted-foreground md:inline">{slug}</code>
        </div>
        {columns.map(cell)}
      </div>

      {open && (
        <div id={detailsId} className="flex flex-col gap-4 border-t bg-muted/20 px-3 py-4 sm:pl-9">
          {children}
        </div>
      )}
    </li>
  )
}

/** An empty cell, so a missing value reads as deliberate. */
export function Dash() {
  return <span className="text-muted-foreground">—</span>
}

function StatusBadge({ status }: { status: PluginStatus }) {
  const t = useTranslations('PluginsPage')
  const { icon: Icon, className } = STATUS_STYLE[status]

  const label: Record<PluginStatus, string> = {
    running: t('statusRunning'),
    off: t('statusOff'),
    error: t('statusError'),
    available: t('statusAvailable'),
  }

  return (
    <Badge variant="outline" className={cn('max-w-full gap-1 whitespace-nowrap font-medium', className)} title={label[status]}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label[status]}</span>
    </Badge>
  )
}

function RegistryBadge({ standing, version }: { standing: RegistryStanding; version: string | null }) {
  const t = useTranslations('PluginRegistry')

  const { label, tone } = {
    unpublished: { label: t('badgeUnpublished'), tone: 'muted' },
    update: { label: t('badgeUpdate', { version: version ?? '' }), tone: 'action' },
    alreadyPublished: { label: t('badgePublished', { version: version ?? '' }), tone: 'ok' },
    behind: { label: t('badgeBehind'), tone: 'warn' },
    taken: { label: t('badgeTaken'), tone: 'warn' },
    published: { label: standing.kind === 'published' && standing.version ? t('badgePublished', { version: standing.version }) : t('noPublished'), tone: 'ok' },
    shared: { label: t('badgeShared', { version: standing.kind === 'shared' ? standing.version : '' }), tone: 'ok' },
  }[standing.kind]

  return (
    <Badge
      variant="outline"
      title={label}
      className={cn('max-w-full gap-1 whitespace-nowrap font-normal', {
        muted: 'text-muted-foreground',
        action: 'border-violet-600/40 bg-violet-600/10 text-violet-700 dark:text-violet-400',
        ok: 'text-foreground',
        warn: 'border-amber-600/40 bg-amber-600/10 text-amber-700 dark:text-amber-400',
      }[tone])}
    >
      <LR.Library className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Badge>
  )
}
