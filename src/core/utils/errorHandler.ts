// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { toast } from 'sonner'

export function handleApiError(error: any) {
  if (error?.status === 401) {
    toast.error('Permission denied')
    return true
  }
  return false
}