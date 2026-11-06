// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export interface VolumeTotals {
  storedGB: number
  fileCount: number
  unsizedCount: number
}

export interface MonthlyUploads {
  month: string
  uploadedGB: number
  fileCount: number
}

export interface TypeVolume {
  type: string
  storedGB: number
  fileCount: number
}

/** What a set of uploaded files adds up to: totals, uploads per `YYYY-MM` month, and storage per file type. */
export interface VolumeReport {
  totals: VolumeTotals
  byMonth: MonthlyUploads[]
  byType: TypeVolume[]
}

/** One uploader within one organization; `userId` is null for files uploaded before uploads were attributed. */
export interface UserUsageRow {
  userId: number | null
  name: string | null
  email: string | null
  organizationName: string
  organizationTitle: string | null
  storedGB: number
  fileCount: number
  lastUploadAt: string | null
}

export interface UserUsageReport extends VolumeReport {
  rows: UserUsageRow[]
}
