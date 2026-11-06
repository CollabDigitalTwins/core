'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useMyUsage, useOrganizationUsage } from '../../hooks/usage/usage'
import { downloadText } from '../../utils/csv'
import { userUsageToCsv } from '../../utils/usageCsv'
import { Button } from '../ui/Button'

import { UserUsageTable } from './UserUsageTable'
import { VolumeOverview } from './VolumeOverview'

import type { ReactNode } from 'react'

export function ReportState({ error, loading, children }: { error: unknown; loading: boolean; children: ReactNode }) {
  const t = useTranslations('UsageReport')
  if (error) return <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{t('loadFailed')}</p>
  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">{t('loading')}</p>
  return children
}

export function ExportCsvButton({ csv, filename }: { csv: () => string; filename: string }) {
  const t = useTranslations('UsageReport')
  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadText(csv(), filename)}>
      <Download aria-hidden className="h-4 w-4" />
      {t('exportCsv')}
    </Button>
  )
}

/** The signed-in user's own uploads, from `ApiAdapter.getMyUsage`. */
export function MyUsage() {
  const { report, isError, isLoading } = useMyUsage()
  return (
    <ReportState error={isError && !report} loading={isLoading && !report}>
      {report && <VolumeOverview report={report} />}
    </ReportState>
  )
}

/** The user's organization, per uploader, from `ApiAdapter.getOrganizationUsage`; the backend decides who may see it. */
export function OrganizationUsage() {
  const { report, isError, isLoading } = useOrganizationUsage()
  return (
    <ReportState error={isError && !report} loading={isLoading && !report}>
      {report && (
        <div className="flex flex-col gap-6">
          <VolumeOverview report={report} />
          <UserUsageTable rows={report.rows} showOrganization={false} actions={<ExportCsvButton csv={() => userUsageToCsv(report.rows)} filename="organization-usage.csv" />} />
        </div>
      )}
    </ReportState>
  )
}
