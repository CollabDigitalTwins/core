import type { Organization, ViewerKey } from '../../types/dbTypes';
/**
 * Whether this organization may show the requested viewer. `appContent` is a Prisma enum and
 * can never hold a plugin key, so a plugin page is gated by enablement instead.
 */
export declare function isViewerAllowed(viewer: ViewerKey, appContent: Organization['appContent']): boolean;
//# sourceMappingURL=viewerAccess.d.ts.map