// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import { typeOfRecord } from '../components/ui/FilesManager/src/fileType'
import { BcfIcon, IdsIcon, IfcIcon } from '../components/ui/Icons/'

import type { FileType } from '../components/ui/FilesManager/src/fileType'
import type { DbFile } from '../types/dbTypes'

export type FileIconComponent = React.ComponentType<{ size?: number, className?: string }>

/** Whatever is known about a file: a stored row, or just what a picked file announced. */
export interface FileIconSubject {
  extension?: string | null
  mimeType?: string | null
  type?: string | null
}

/** Kinds no extension alone can settle, such as a point cloud that converted to a directory. */
const BY_KIND: Partial<Record<FileType, FileIconComponent>> = {
  'bim-file': IfcIcon,
  'point-cloud-file': LR.Grip,
  'splat-file': LR.Sparkles,
  'cad-file': LR.DraftingCompass,
  '3d-file': LR.FileAxis3d,
}

const BY_EXTENSION: Record<string, FileIconComponent> = {

  ifc: IfcIcon, frag: IfcIcon,
  ids: IdsIcon,
  bcf: BcfIcon,

  doc: LR.FileText, docx: LR.FileText, rtf: LR.FileText, txt: LR.FileText, md: LR.FileText, pdf: LR.FileText,

  xls: LR.FileSpreadsheet, xlsx: LR.FileSpreadsheet, csv: LR.FileSpreadsheet, dbf: LR.FileSpreadsheet,

  ppt: LR.Presentation, pptx: LR.Presentation,

  zip: LR.Archive, rar: LR.Archive, '7z': LR.Archive,

  jpg: LR.Image, jpeg: LR.Image, png: LR.Image, gif: LR.Image, bmp: LR.Image, svg: LR.Image, webp: LR.Image,

  mp4: LR.Video, webm: LR.Video, mov: LR.Video, avi: LR.Video, mkv: LR.Video,

  mp3: LR.Music, wav: LR.Music, ogg: LR.Music, m4a: LR.Music, flac: LR.Music,

  shp: LR.Map, shx: LR.Map, prj: LR.Map, cpg: LR.Map, geojson: LR.Map,

  h2k: LR.Zap,

  glb: LR.FileAxis3d, gltf: LR.FileAxis3d, fbx: LR.FileAxis3d, obj: LR.FileAxis3d, dae: LR.FileAxis3d,

  las: LR.Grip, laz: LR.Grip, e57: LR.Grip,

  ply: LR.Sparkles, spl: LR.Sparkles, splat: LR.Sparkles, ksplat: LR.Sparkles, sog: LR.Sparkles
}

const BY_MIME_FAMILY: [string, FileIconComponent][] = [
  ['image/', LR.Image],
  ['video/', LR.Video],
  ['audio/', LR.Music],
  ['application/pdf', LR.FileText],
]

/** The one icon a file gets, wherever it is drawn: a marker, a row, a menu or a card. */
export function iconForFile(subject: FileIconSubject): FileIconComponent {
  const extension = subject.extension?.toLowerCase()

  const sidecar = extension ? BY_EXTENSION[extension] : undefined
  if (sidecar === IdsIcon || sidecar === BcfIcon) return sidecar

  const byKind = BY_KIND[typeOfRecord(subject as DbFile)]
  if (byKind) return byKind

  if (sidecar) return sidecar

  const mimeType = subject.mimeType?.toLowerCase() ?? ''
  const family = BY_MIME_FAMILY.find(([prefix]) => mimeType.startsWith(prefix))

  return family?.[1] ?? LR.File
}
