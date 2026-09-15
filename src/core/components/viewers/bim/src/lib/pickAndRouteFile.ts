// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { ACCEPT_FOR_TYPE, typeOfFile } from '../../../../ui/FilesManager/src/fileType'

import type { FileType } from '../../../../ui/FilesManager/src/fileType'

export interface FileRoute {
  /** Types this entry point offers. Omitted means every type. */
  accept?: readonly FileType[]
  needsPlacement: (file: File) => boolean
  onPlace: (file: File) => void
  onSubmit: (file: File) => void
  onReject?: (file: File) => void
}

/** The one decision behind every add-file button, so the toolbar and the sidebar cannot disagree. */
export function routePickedFile(file: File, route: FileRoute): void {
  const { accept, needsPlacement, onPlace, onSubmit, onReject } = route

  if (accept && !accept.includes(typeOfFile(file))) {
    onReject?.(file)
    return
  }

  if (needsPlacement(file)) onPlace(file)
  else onSubmit(file)
}

export function acceptAttribute(accept?: readonly FileType[]): string {
  if (!accept || accept.length === 0) return '*/*'
  return accept.map(type => ACCEPT_FOR_TYPE[type]).join(',')
}

export function pickFile(accept: string, onPicked: (file: File) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.addEventListener('change', () => {
    const picked = input.files?.[0]
    if (picked) onPicked(picked)
  })
  input.click()
}
