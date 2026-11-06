'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { CalendarClock, Database, Files } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { gbFormatter, monthLabel, numberFormatter } from '../../utils/usageFormat'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'

import { StatCard } from './StatCard'
import { USAGE_COLORS } from './usagePalette'

import type { MonthlyUploads, TypeVolume, VolumeReport } from '../../types/usage'
import type { ChartConfig } from '../ui/chart'
import type { ComponentProps } from 'react'

const CHART_HEIGHT = 220

type TooltipFormatter = NonNullable<ComponentProps<typeof ChartTooltipContent>['formatter']>

function uploadedRowFormatter(gb: (value: number) => string, label: string): TooltipFormatter {
  return value => (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium tabular-nums text-foreground">{gb(Number(value))}</span>
    </div>
  )
}

function UploadsByMonthChart({ months }: { months: readonly MonthlyUploads[] }) {
  const t = useTranslations('UsageReport.chart')
  const locale = useLocale()
  const gb = gbFormatter(locale)
  const config = { uploadedGB: { label: t('uploaded'), theme: USAGE_COLORS.storage } } satisfies ChartConfig
  const shortMonth = (month: string) => monthLabel(locale, month)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto w-full" style={{ height: CHART_HEIGHT }}>
          <BarChart data={[...months]} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} className="stroke-border/60" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} tickFormatter={value => shortMonth(String(value))} />
            <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={value => gb(Number(value))} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={value => shortMonth(String(value))} formatter={uploadedRowFormatter(gb, t('uploaded'))} />} />
            <Bar dataKey="uploadedGB" fill="var(--color-uploadedGB)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function TypeBreakdown({ types }: { types: readonly TypeVolume[] }) {
  const t = useTranslations('UsageReport.byType')
  const locale = useLocale()
  const gb = gbFormatter(locale)
  const largest = Math.max(...types.map(type => type.storedGB), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {types.map(type => (
            <li key={type.type} className="space-y-1">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="truncate">{type.type}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {gb(type.storedGB)} · {t('files', { count: type.fileCount })}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${largest > 0 ? (100 * type.storedGB) / largest : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function VolumeOverview({ report }: { report: VolumeReport }) {
  const t = useTranslations('UsageReport.stats')
  const locale = useLocale()
  const gb = gbFormatter(locale)
  const count = numberFormatter(locale, 0)
  const lastMonth = report.byMonth.at(-1)

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Database} label={t('stored')} value={gb(report.totals.storedGB)}>
          {report.totals.unsizedCount > 0 && <p>{t('unsized', { count: report.totals.unsizedCount })}</p>}
        </StatCard>
        <StatCard icon={Files} label={t('files')} value={count(report.totals.fileCount)} />
        <StatCard icon={CalendarClock} label={t('latestMonth')} value={lastMonth ? gb(lastMonth.uploadedGB) : '—'}>
          {lastMonth && <p>{monthLabel(locale, lastMonth.month)}</p>}
        </StatCard>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <UploadsByMonthChart months={report.byMonth} />
        <TypeBreakdown types={report.byType} />
      </div>
    </div>
  )
}
