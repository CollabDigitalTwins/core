// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { typeOfRecord } from '../../../../../ui/FilesManager/src/fileType'

import type { PropertyGroup } from './utils'
import type { DbFile } from '../../../../../../types/dbTypes'

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

function formatSize(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000
    unit += 1
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`
}

function formatUploadedAt(uploadedAt: string): string | null {
  const date = new Date(uploadedAt)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString()
}

/** What a file record can say about itself, for the panel's Identity Data group. */
export function fileIdentityGroup(file: DbFile, labels: Record<string, string>): PropertyGroup {
  const typeLabel = labels[`type_${typeOfRecord(file)}`]
  const uploadedAt = formatUploadedAt(file.uploadedAt)

  const properties = [
    { name: labels.name, value: file.name },
    { name: labels.type, value: typeLabel },
    file.extension ? { name: labels.extension, value: file.extension } : null,
    file.sizeBytes ? { name: labels.size, value: formatSize(file.sizeBytes) } : null,
    uploadedAt ? { name: labels.uploaded, value: uploadedAt } : null,
    file.description ? { name: labels.description, value: file.description } : null,
  ].filter((property): property is { name: string, value: string } => property !== null)

  return {
    id: 'identity-data',
    name: labels.identity,
    icon: React.createElement(LR.User2, { className: 'h-4 w-4' }),
    properties,
  }
}
