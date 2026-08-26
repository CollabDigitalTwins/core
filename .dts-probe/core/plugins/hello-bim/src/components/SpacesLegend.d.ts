import type { LegendRow } from '@collabdt/plugin-kit/types/legend';
/**
 * One row per space, live as they are renamed and recoloured. The legend probe is mounted for
 * as long as the viewer, so this is also what discovers the model's spaces.
 */
export declare function useSpacesLegend(): {
    active: boolean;
    title?: string;
    rows: LegendRow[];
};
//# sourceMappingURL=SpacesLegend.d.ts.map