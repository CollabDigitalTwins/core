// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { POINT_CLOUD_ACCEPT, POINT_CLOUD_EXTENSIONS } from '../../../viewers/bim/src/PointClouds/pointCloudFiles'

import type { DbFile } from '../../../../types/dbTypes'

export type FileType =
  | 'bim-file'
  | 'point-cloud-file'
  | '3d-file'
  | 'cad-file'
  | 'media-file'
  | 'document-file'
  | 'file'

export type FileSection = 'bim' | 'models' | 'pointClouds' | 'files'

export const EXTENSIONS_FOR_TYPE: Record<FileType, readonly string[]> = {
  'bim-file': ['ifc', 'frag'],
  'point-cloud-file': POINT_CLOUD_EXTENSIONS,
  '3d-file': ['glb', 'gltf', 'fbx', 'obj', 'dae'],
  'cad-file': ['dxf', 'dwg'],
  'media-file': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg'],
  'document-file': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'rtf', 'odt'],
  file: [],
}

export const SECTION_FOR_TYPE: Record<FileType, FileSection> = {
  'bim-file': 'bim',
  '3d-file': 'models',
  'point-cloud-file': 'pointClouds',
  'cad-file': 'files',
  'media-file': 'files',
  'document-file': 'files',
  file: 'files',
}

export const ACCEPT_FOR_TYPE: Record<FileType, string> = {
  'bim-file': '.ifc,.frag',
  'point-cloud-file': POINT_CLOUD_ACCEPT,
  '3d-file': '.glb,.gltf,.fbx,.obj,.dae',
  'cad-file': '.dxf,.dwg',
  'media-file': 'image/*,video/*,audio/*',
  'document-file': '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.rtf,.odt',
  file: '*/*',
}

const ORDER: readonly FileType[] = [
  'bim-file', 'point-cloud-file', '3d-file', 'cad-file', 'media-file', 'document-file',
]

const STORED_TYPES = new Set<string>(['bim-file', 'point-cloud-file', '3d-file', 'cad-file', 'media-file', 'document-file'])

const byExtension = (extension: string): FileType | null => {
  if (!extension) return null
  const lower = extension.toLowerCase()
  return ORDER.find(type => EXTENSIONS_FOR_TYPE[type].includes(lower)) ?? null
}

const byMimeType = (mimeType: string): FileType | null => {
  if (/^(image|video|audio)\//.test(mimeType.toLowerCase())) return 'media-file'
  return null
}

const extensionOfName = (name: string): string => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.copc.laz')) return 'copc'
  const parts = lower.split('.')
  return parts.length > 1 ? parts.pop()! : ''
}

export function typeOfFile(file: File): FileType {
  return byExtension(extensionOfName(file.name)) ?? byMimeType(file.type) ?? 'file'
}

export function typeOfRecord(file: DbFile): FileType {
  const stored = file.type?.toLowerCase() ?? ''
  return byExtension(file.extension ?? '')
    ?? byMimeType(file.mimeType ?? '')
    ?? (STORED_TYPES.has(stored) ? (stored as FileType) : 'file')
}
