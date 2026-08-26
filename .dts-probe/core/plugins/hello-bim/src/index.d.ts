import type { BimToolProps, PluginContext } from '@collabdt/plugin-kit/types/bim';
import type { LegendRegistration } from '@collabdt/plugin-kit/types/legend';
type Ctx = PluginContext<unknown, BimToolProps, unknown, LegendRegistration>;
/**
 * Four surfaces over the model IfcSpaces, all reading one hook. The IFC is never written to:
 * a renamed space is an annotation this plugin stores, and the dialog shows both names.
 */
export declare function activate(ctx: Ctx): void;
export {};
//# sourceMappingURL=index.d.ts.map