// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Language } from '../types/dbTypes'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFileExtension(file: File): string {
  const parts = file.name.split('.')
  if (parts.length <= 1) return ''
  return parts.pop()!.toLowerCase()
}

export async function switchLanguage(
  newLocale: Language |`${Language}`,
  setCurrentLocale?: (locale: Language |`${Language}`) => void,
  router?: { refresh: () => void }
) {
  // Set cookie that expires in 1 year
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  document.cookie = `NEXT_LOCALE=${newLocale}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

  // Update local state immediately for UI feedback
  if (setCurrentLocale) {
    setCurrentLocale(newLocale);
  }

  // Use router.refresh() to reload server components with new locale
  if (router) {
    router.refresh();
  }
}
