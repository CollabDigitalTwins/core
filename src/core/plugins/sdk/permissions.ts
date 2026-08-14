'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePermissions } from '../../store/Permissions/context'

import type { MongoAbility } from '@casl/ability'

export interface PluginPermissions {
  /**
   * The signed-in user's CASL ability, e.g. `can('update', 'Sensor')`.
   *
   * Read this to hide UI the user cannot use. It is **not** a security boundary:
   * the API routes re-check every action server-side, which is what actually
   * enforces it. A plugin skipping this check gets a 403, not access.
   */
  ability: MongoAbility
  isLoading: boolean
}

export function usePluginPermissions(): PluginPermissions {
  const { ability, isLoading } = usePermissions()
  return { ability, isLoading }
}
