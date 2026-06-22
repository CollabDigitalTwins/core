// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Loading state shared by tools that drive a "view" sidebar section
 *  (FloorplanTool, ElevationsTool, …). Each tool defines its own concrete
 *  Stage union; the section translates the stage into a localized message. */
export interface ViewLoadingState<Stage extends string = string> {
  isLoading: boolean
  stage?: Stage
}

/** Resolve a percent value for the progress bar. Returns 0 for an unknown
 *  or absent stage so the caller doesn't need to defend against it. */
export function stagePercent<Stage extends string>(
  stage: Stage | undefined,
  table: Record<Stage, number>,
): number {
  if (!stage) return 0
  return table[stage] ?? 0
}

/** Minimal shape consumed by ViewSectionList — each section maps its
 *  tool-specific entries (FloorplanEntry, ElevationEntry, …) to this. */
export interface ViewListEntry {
  id: string
  label: string
}
