"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import React, { createContext, useContext, useMemo } from "react";

import { createBuildingHooks } from "./buildings/createBuildingHooks";
import { createCommentHooks } from "./comments/createCommentHooks";
import { createFileHooks } from "./files/createFileHooks";
import { createInfrastructureHooks } from './infrastructures/createInfrastructureHooks';
import { createOpenDataPortalHooks } from "./openDataPortals/createOpenDataPortalHooks";
import { createOrganizationHooks } from "./organizations/createOrganizationHooks";
import { createSensorHooks } from "./sensors/createSensorHooks";
import { createPluginHooks } from "./plugins/createPluginHooks";
import { createSensorTypeHooks } from "./sensorTypes/createSensorTypeHooks";
import { createSiteHooks } from "./sites/createSiteHooks";
import { createUserHooks } from "./users/createUserHooks";

import type { ApiAdapter } from "./ports/apiAdapter";

// CoreHooksProvider takes an ApiAdapter (the object that knows how to fetch data) and
// creates all the app's data-fetching hooks from it. Mount it once at the root so every
// page has access. Inside any component, call useCoreHooks() to get the hooks, or import
// from the per-domain convenience wrappers (e.g. useGetBuildings from hooks/buildings/buildings.ts).

export type HooksBag = {
  building: ReturnType<typeof createBuildingHooks>;
  file: ReturnType<typeof createFileHooks>;
  openData: ReturnType<typeof createOpenDataPortalHooks>;
  site: ReturnType<typeof createSiteHooks>;
  infrastructure: ReturnType<typeof createInfrastructureHooks>;
  user: ReturnType<typeof createUserHooks>;
  organization: ReturnType<typeof createOrganizationHooks>;
  comment: ReturnType<typeof createCommentHooks>;
  sensor: ReturnType<typeof createSensorHooks>;
  sensorType: ReturnType<typeof createSensorTypeHooks>;
  plugin: ReturnType<typeof createPluginHooks>;
};
export const HooksCtx = createContext<HooksBag | null>(null);

export function CoreHooksProvider({ adapter, children }:{ adapter: ApiAdapter; children: React.ReactNode }) {
  // Build the bound hook set exactly once per adapter instance
  const hooks = useMemo<HooksBag>(() => ({
    building: createBuildingHooks(adapter),
    file: createFileHooks(adapter),
    openData: createOpenDataPortalHooks(adapter),
    site: createSiteHooks(adapter),
    infrastructure: createInfrastructureHooks(adapter),
    user: createUserHooks(adapter),
    organization: createOrganizationHooks(adapter),
    comment: createCommentHooks(adapter),
    sensor: createSensorHooks(adapter),
    sensorType: createSensorTypeHooks(adapter),
    plugin: createPluginHooks(adapter),
  }), [adapter]);
  return <HooksCtx.Provider value={hooks}>{children}</HooksCtx.Provider>;
}

export function useCoreHooks() {
  const ctx = useContext(HooksCtx);
  if (!ctx) throw new Error("useCoreHooks must be used inside <CoreHooksProvider>");
  return ctx;
}