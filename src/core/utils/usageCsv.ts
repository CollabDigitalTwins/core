// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { toCsv } from './csv'

import type { UserUsageRow } from '../types/usage'

export function userUsageToCsv(rows: readonly UserUsageRow[]): string {
  return toCsv(
    ['user', 'email', 'organization', 'stored_gb', 'files', 'last_upload'],
    rows.map(row => [row.name ?? 'unattributed', row.email, row.organizationTitle ?? row.organizationName, row.storedGB, row.fileCount, row.lastUploadAt]),
  )
}
