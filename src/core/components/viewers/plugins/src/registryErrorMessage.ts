// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { RegistryRequestError } from './useRegistryPlugins'

/** The registry's own explanation, with any per-item details (forbidden imports, manifest errors) appended. */
export function registryErrorMessage(error: unknown): string {
  if (error instanceof RegistryRequestError) {
    return error.details.length > 0 ? `${error.message}: ${error.details.join(', ')}` : error.message
  }
  return error instanceof Error ? error.message : 'Unknown error'
}
