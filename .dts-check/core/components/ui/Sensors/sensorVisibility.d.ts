import type { Sensor, ViewerNames } from '../../../types/dbTypes';
/**
 * Stable key used in state for sensors with no tags. Locale-independent.
 *
 * Defined here rather than in `SensorsSection` so the pure modules and the map/BIM layers can
 * reach it without importing the sidebar component; `SensorsSection` re-exports it.
 */
export declare const UNTAGGED_TAG = "__untagged__";
/** The slice of `MenusState` that decides whether a sensor is drawn, for one viewer. */
export interface SensorVisibilityScope {
    viewer: ViewerNames;
    visibleTypeIds: readonly number[];
    visibleTags: readonly string[];
}
/** Enough of a sensor to decide its visibility. Keeps callers free to pass enriched rows. */
export type VisibilityCandidate = Pick<Sensor, 'viewer' | 'typeId' | 'tags'>;
/**
 * Whether a sensor is drawn in a viewer.
 *
 * Type and tag are alternatives, not filters that compose: the sidebar groups by one or the
 * other and clears the opposing state when you switch, so a sensor shows if either channel
 * selects it. A sensor carrying no tags is selected by `UNTAGGED_TAG`.
 */
export declare function isSensorVisible(sensor: VisibilityCandidate, scope: SensorVisibilityScope): boolean;
/** `isSensorVisible` over a list, preserving the caller's element type. */
export declare function visibleSensors<T extends VisibilityCandidate>(sensors: readonly T[], scope: SensorVisibilityScope): T[];
/**
 * The sensor type the viewer is currently explaining: what the legend titles itself with, what
 * the marker halos colour by, and what the map colours buildings by.
 *
 * A type pinned in the legend dropdown wins, so those three stay in agreement after the user
 * retargets the legend. Otherwise it follows the active sensor, which callers resolve
 * differently: the legend lets hover stand in for focus, the viewers use focus alone so halos
 * do not flicker as the pointer sweeps the scene.
 */
export declare function activeSensorTypeId(sensors: readonly Pick<Sensor, 'id' | 'typeId'>[], opts: {
    legendTypeId?: number | null;
    activeSensorId?: number | null;
}): number | null;
/**
 * The sensors that keep the legend on screen: the active type's visible ones in this viewer.
 *
 * Shared so the card and the sidebar's show/hide button agree on whether there is a legend at
 * all; an empty result means the card renders nothing and the button has nothing to toggle.
 */
export declare function legendScopeSensors<T extends VisibilityCandidate>(sensors: readonly T[], scope: SensorVisibilityScope, activeTypeId: number | null): T[];
//# sourceMappingURL=sensorVisibility.d.ts.map