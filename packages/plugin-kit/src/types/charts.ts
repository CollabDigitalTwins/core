// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as React from 'react'

// Loose on purpose: Recharts' own types would make every plugin install Recharts to typecheck.

/** Series styling keyed by data key, as the shadcn chart wrapper reads it. */
export type ChartConfig = Record<string, { label?: React.ReactNode; icon?: React.ComponentType } & (
  | { color?: string; theme?: never }
  | { color?: never; theme: { light: string; dark: string } }
)>

export interface ChartContainerProps extends React.ComponentPropsWithoutRef<'div'> {
  config: ChartConfig
  children: React.ReactNode
}
export type ChartContainerComponent = React.ComponentType<ChartContainerProps>

/** A Recharts component, typed by what a plugin may pass rather than by Recharts' own declarations. */
export type RechartsComponent = React.ComponentType<Record<string, unknown> & { children?: React.ReactNode }>
