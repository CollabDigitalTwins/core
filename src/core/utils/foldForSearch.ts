// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Lowercases `text` and strips its accents, so `Québec` and `QUEBEC` compare equal. */
export const foldForSearch = (text: string): string =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
