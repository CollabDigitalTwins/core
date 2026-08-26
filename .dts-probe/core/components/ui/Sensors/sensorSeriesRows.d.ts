import type { SensorSeries } from './sensorData';
/** One row per timestamp: `t` plus a value per sensor id that reported at that instant. */
export interface SeriesRow {
    t: number;
    [sensorId: string]: number;
}
/**
 * Merges per-sensor series into the single row array a recharts multi-line chart needs.
 *
 * Sensors poll independently, so their timestamps rarely line up: the rows are the union of
 * every timestamp, and a sensor that has no reading at one is simply absent from that row.
 * Lines are drawn with `connectNulls` so those gaps do not break a series in two.
 *
 * Keys are the sensor ids as strings, which is what `Line dataKey` needs.
 */
export declare function mergeSeriesRows(seriesById: Map<number, SensorSeries>, ids: number[]): SeriesRow[];
/** Domain covering every value across the given sensors, for a shared y-axis. */
export declare function rowsValueDomain(rows: SeriesRow[], ids: number[]): {
    min: number;
    max: number;
} | null;
//# sourceMappingURL=sensorSeriesRows.d.ts.map