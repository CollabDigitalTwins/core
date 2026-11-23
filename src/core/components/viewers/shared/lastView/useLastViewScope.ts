'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

/** Remembered views are per instance and per user, so a shared browser never offers one person another's view. */
export function useLastViewScope(): string | null {
  const pathname = usePathname()
  const { data: session } = useSession()
  const instance = pathname?.split('/')[1]
  const userId = session?.user?.id
  return instance && userId ? `${instance}:${userId}` : null
}
