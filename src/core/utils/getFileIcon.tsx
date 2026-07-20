// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import type { DbFile } from '../types/dbTypes'
import { IfcIcon, IdsIcon, BcfIcon } from '../components/ui/Icons/'


export function getFileIcon(file: DbFile) {
  const { extension } = file
  switch (extension?.toLowerCase()) {
    case 'ifc':
    case 'frag':
      return IfcIcon
    case 'jpg':
    case 'jpeg':
    case 'png':
      return LR.Image
    case 'mp4':
    case 'mov':
    case 'avi':
      return LR.Video
    case 'rvt':
    case 'glb':
    case 'gltf':
    case 'obj':
    case 'fbx':
      return LR.Box
    case 'pdf':
    case 'doc':
    case 'txt':
    case 'docx':
      return LR.FileText
    case 'xlsx':
    case 'xls':
    case 'csv':
      return LR.Table
    case 'ppt':
    case 'pptx':
      return LR.Presentation
    case 'zip':
    case 'rar':
      return LR.Archive
    case 'mp3':
    case 'wav':
      return LR.Music
    case 'las':
    case 'laz':
      return LR.Grip
    case 'dwg':
    case 'dxf':
      return LR.DraftingCompass
    case 'ids':
      return IdsIcon
    case 'bcf':
      return BcfIcon
    default:
      return LR.File
  }
}
