"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

/**
 * Convenience wrapper so components can import hooks directly from src/core/hooks/sensors
 * Instead of calling useCoreHooks().sensors first from src/core/hooks/provider.tsx
 */

export const useSensors = () =>
  useCoreHooks().sensor.useSensors();

export const useSensor = (id: number | null) =>
  useCoreHooks().sensor.useSensor(id);

export const useSensorsByAuthor = (authorId: number | null) =>
  useCoreHooks().sensor.useSensorsByAuthor(authorId);

export const useSensorsByBuilding = (buildingId: number | null) =>
  useCoreHooks().sensor.useSensorsByBuilding(buildingId);

export const useCreateSensor = () =>
  useCoreHooks().sensor.useCreateSensor();
