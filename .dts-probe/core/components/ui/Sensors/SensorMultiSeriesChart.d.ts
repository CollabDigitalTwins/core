import * as React from 'react';
import { type RangeBounds } from './sensorRange';
import type { SensorSeries } from './sensorData';
export interface MultiSeriesEntry {
    id: number;
    name: string;
}
interface SensorMultiSeriesChartProps {
    sensors: MultiSeriesEntry[];
    seriesById: Map<number, SensorSeries>;
    focusedId: number;
    /** Click a line or a legend row to focus that sensor everywhere. */
    onFocus: (sensorId: number) => void;
    /** Colour for the focused line, carrying its current value. Siblings are not coloured. */
    focusColour: string;
    unit?: string;
    valueLabels?: Record<number, string>;
    timeZone: string;
    emptyText: string;
    othersLabel: (count: number) => string;
    /** Window to show. `null` spans everything. Ignored unless `onBoundsChange` is supplied. */
    bounds?: RangeBounds | null;
    /** Supplying this renders the brush. Dragging it reports the new window in milliseconds. */
    onBoundsChange?: (bounds: RangeBounds) => void;
}
/**
 * Every sensor in scope over time, using the emphasis pattern: the focused sensor is the only
 * coloured line and the rest are recessive hairlines. That one colour is the focused sensor's
 * own value ramp colour, so the line matches its bar, its halo and the legend caret.
 *
 * Why not a colour per sensor: a type can hold dozens of sensors, and past a handful of hues
 * adjacent series stop being distinguishable (especially under colour-vision deficiency). Here
 * identity comes from the legend list, the hover lift and the shared tooltip rather than from
 * colour, so it holds at any series count. Clicking a line or a legend row re-focuses, which
 * also moves the marker halos and the viewer legend.
 */
export declare function SensorMultiSeriesChart({ sensors, seriesById, focusedId, onFocus, focusColour, unit, valueLabels, timeZone, emptyText, othersLabel, bounds, onBoundsChange, }: SensorMultiSeriesChartProps): React.ReactElement;
export {};
//# sourceMappingURL=SensorMultiSeriesChart.d.ts.map