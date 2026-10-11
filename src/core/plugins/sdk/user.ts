'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Collab Digital Twins

import { useSession } from 'next-auth/react'

export interface PluginUser {
  id: string
  name: string
}

/** The signed-in person's id and display name, or null while the session loads or when signed out. */
export function usePluginUser(): PluginUser | null {
  const user = useSession().data?.user
  if (!user) return null
  return { id: user.id, name: user.name }
}
