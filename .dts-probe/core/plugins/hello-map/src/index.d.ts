import type { LegendRegistration } from '@collabdt/plugin-kit/types/legend';
import type { MapToolProps, PluginContext } from '@collabdt/plugin-kit/types/map';
type Ctx = PluginContext<MapToolProps, unknown, unknown, LegendRegistration>;
/**
 * Six surfaces over one store and one selection, in React subtrees with no common ancestor.
 * Without that shared state this would be six unrelated widgets in one bundle.
 */
export declare function activate(ctx: Ctx): void;
export {};
//# sourceMappingURL=index.d.ts.map