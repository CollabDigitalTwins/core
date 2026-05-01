"use client";
import React, { createContext, useContext, useMemo } from "react";
import type { ApiAdapter } from "./ports/apiAdapter";
import { createBuildingHooks } from "./buildings/createBuildingHooks";
import { createFileHooks } from "./files/createFileHooks";
import { createOpenDataPortalHooks } from "./openDataPortals/createOpenDataPortalHooks";
import { createSiteHooks } from "./sites/createSiteHooks";
import { createUserHooks } from "./users/createUserHooks";
import { createOrganizationHooks } from "./organizations/createOrganizationHooks";
import { createCommentHooks } from "./comments/createCommentHooks";
import { createSensorHooks } from "./sensors/createSensorHooks";
import { createInfrastructureHooks } from './infrastructures/createInfrastructureHooks';
import { createSensorTypeHooks } from "./sensorTypes/createSensorTypeHooks";

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
  }), [adapter]);
  return <HooksCtx.Provider value={hooks}>{children}</HooksCtx.Provider>;
}

export function useCoreHooks() {
  const ctx = useContext(HooksCtx);
  if (!ctx) throw new Error("useCoreHooks must be used inside <CoreHooksProvider>");
  return ctx;
}