import * as OBC from '@thatopen/components';
/**
 * Serialize a {@link OBC.TechnicalDrawing} to DXF and trigger a browser
 * download. Each per-IFC-class drawing layer becomes a DXF layer, so the
 * downloaded file is editable layer-by-layer in CAD software.
 *
 * `rotationDeg` rotates the exported geometry around the drawing's local Y
 * axis (XZ plane) so the DXF lands in the same orientation the user sees
 * on screen — typically the building's true-north angle. The transform is
 * applied to a temporary clone of each `LineSegments`'s position buffer
 * and reverted before the function returns, so the live drawing is never
 * mutated.
 *
 * Uses {@link OBC.DxfManager}'s exporter — see the `OBC.DxfExporter` class
 * documentation for the full set of supported entities.
 */
export declare function exportDrawingToDxf(components: OBC.Components, drawing: OBC.TechnicalDrawing, fileName: string, rotationDeg?: number): void;
//# sourceMappingURL=exportDrawingToDxf.d.ts.map