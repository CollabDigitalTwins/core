// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Building } from '../types/dbTypes'

/** The building's name, else its address; undefined when it has neither, so callers pick the fallback. */
export const buildingDisplayName = (building: Pick<Building, 'buildingName' | 'buildingAddress'> | undefined) =>
  building?.buildingName || building?.buildingAddress || undefined
