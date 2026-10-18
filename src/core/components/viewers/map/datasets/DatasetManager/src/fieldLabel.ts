// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { formatName } from '../../utils'

import type { DatasetField } from '../../../../../../types/datasetTypes'

const LANGUAGE_MARKERS: Record<string, string[]> = {
  en: ['en', 'eng', 'engl', 'english'],
  fr: ['fr', 'fre', 'french'],
  es: ['es', 'esp', 'spanish'],
}

export function fieldLabel(field: DatasetField): string {
  return field.alias || formatName(field.name)
}

/** True for a field suffixed or prefixed with another language's marker, such as `name_fr` while browsing in English. */
export function isOtherLanguageField(name: string, locale: string): boolean {
  const lower = name.toLowerCase()
  return Object.entries(LANGUAGE_MARKERS)
    .filter(([language]) => language !== locale.toLowerCase())
    .some(([, markers]) => markers.some(marker => lower === marker || lower.endsWith(`_${marker}`) || lower.startsWith(`${marker}_`)))
}
