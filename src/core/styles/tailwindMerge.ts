// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { ClassValue} from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
