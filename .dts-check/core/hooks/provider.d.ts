import React from "react";
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
export declare const HooksCtx: React.Context<HooksBag>;
export declare function CoreHooksProvider({ adapter, children }: {
    adapter: ApiAdapter;
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useCoreHooks(): HooksBag;
//# sourceMappingURL=provider.d.ts.map