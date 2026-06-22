"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useCoreHooks } from "../provider";

/**
 * Convenience wrapper so components can import hooks directly from src/core/hooks/sensorTypes
 * Instead of calling useCoreHooks().sensorTypes first from src/core/hooks/provider.tsx
 */

export const useSensorTypes = () =>
  useCoreHooks().sensorType.useSensorTypes();

export const useSensorType = (id: number | null) =>
  useCoreHooks().sensorType.useSensorType(id);

export const useCreateSensorType = () =>
  useCoreHooks().sensorType.useCreateSensorType();
