import * as OBC from '@thatopen/components';
import { type ModelIdMap } from './bimTree';
/**
 * Every element of one IFC class, across all loaded models.
 *
 * Matched case-insensitively against the whole name, so `'IfcSpace'` and
 * `'IFCSPACE'` both work and neither matches `IFCSPACEHEATER`.
 *
 * Note for callers wanting spaces: `IFCSPACE` is in
 * {@link DEFAULT_HIDDEN_IFC_CLASSES}, so its elements exist but start hidden.
 * Showing them is a separate `setItemsVisible` call.
 */
export declare function getItemsOfCategory(components: OBC.Components, category: string): Promise<ModelIdMap>;
export interface BimItemProperties extends Record<string, unknown> {
    modelId: string;
    localId: number;
}
/**
 * Attributes for the given elements, one entry per element.
 *
 * Pass `attributes` to limit what is read (`['Name', 'LongName']`); omit it for
 * the model's default attribute set. `modelId` and `localId` are always included
 * so a caller can map a result back to the element it came from.
 */
export declare function getItemProperties(components: OBC.Components, items: ModelIdMap, attributes?: string[]): Promise<BimItemProperties[]>;
//# sourceMappingURL=bimQueries.d.ts.map