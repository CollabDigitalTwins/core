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

const IDENTITY_GROUP_ID = 'identity-data'

const identityGroup = (labels: Record<string, string>, properties: PropertyGroup['properties']): PropertyGroup => ({
  id: IDENTITY_GROUP_ID,
  name: labels.identity,
  icon: React.createElement(LR.User2, { className: 'h-4 w-4' }),
  properties,
})

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

  return identityGroup(labels, properties)
}

/** An element's groups with the file it came from leading Identity Data. */
export function withElementFile(groups: PropertyGroup[], fileName: string | null, labels: Record<string, string>): PropertyGroup[] {
  if (!fileName) return groups
  const fileRow = { name: labels.file, value: fileName }
  const identity = groups.find(group => group.id === IDENTITY_GROUP_ID)
  if (!identity) return [identityGroup(labels, [fileRow]), ...groups]
  return groups.map(group => (group === identity ? { ...group, properties: [fileRow, ...group.properties] } : group))
}
