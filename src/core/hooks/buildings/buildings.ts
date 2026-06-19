"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

/**
 * Convenience wrapper so components can import hooks directly from src/core/hooks/buildings
 * Instead of calling useCoreHooks().building first from src/core/hooks/provider.tsx
 */

export const useBuildings = () =>
  useCoreHooks().building.useBuildings();

export const useBuilding = (id: number | null) =>
  useCoreHooks().building.useBuilding(id);

export const useBuildingsByOsm = (osmId: number | null) =>
  useCoreHooks().building.useBuildingsByOsm(osmId);

export const useBuildingOsmIds = () =>
  useCoreHooks().building.useBuildingOsmIds();

export const useCreateBuilding = () =>
  useCoreHooks().building.useCreateBuilding();