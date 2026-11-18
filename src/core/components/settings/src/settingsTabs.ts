// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { SettingsTabKey } from './types'

type Can = (action: string, subject: string) => boolean

const REQUIRED: Partial<Record<SettingsTabKey, [action: string, subject: string]>> = {
  users: ['update', 'Role'],
  organization: ['update', 'Organization'],
}

/** Whether a role sees a settings section; Account is everyone's. */
export function canSeeSettingsTab(can: Can, key: SettingsTabKey): boolean {
  const required = REQUIRED[key]
  return !required || can(...required)
}
