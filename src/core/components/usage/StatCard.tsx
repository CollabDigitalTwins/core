// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function StatCard({ icon: Icon, label, value, children }: { icon: LucideIcon; label: string; value: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon aria-hidden className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        <div className="space-y-0.5 text-xs text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  )
}
