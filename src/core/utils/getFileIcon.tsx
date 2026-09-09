// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'

import { typeOfRecord } from '../components/ui/FilesManager/src/fileType'
import { IfcIcon, IdsIcon, BcfIcon } from '../components/ui/Icons/'

import type { DbFile } from '../types/dbTypes'


export function getFileIcon(file: DbFile) {
  const { extension } = file
  switch (typeOfRecord(file)) {
    case 'bim-file':
      return IfcIcon
    case 'point-cloud-file':
      return LR.Grip
    case 'cad-file':
      return LR.DraftingCompass
    case '3d-file':
      return LR.Box
  }

  switch (extension?.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
    case 'png':
      return LR.Image
    case 'mp4':
    case 'mov':
    case 'avi':
      return LR.Video
    case 'rvt':
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
    case 'ids':
      return IdsIcon
    case 'bcf':
      return BcfIcon
    default:
      return LR.File
  }
}
