// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// A label-and-value row, in its own file because a plugin is not limited to one component.
// The build bundles every file under src/ into a single dist/index.js, so splitting the
// source costs nothing at delivery time: the one-file output is how a plugin is served, not
// how it has to be written.
export function ReadoutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
