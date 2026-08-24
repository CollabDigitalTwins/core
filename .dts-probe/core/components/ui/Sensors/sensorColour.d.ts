import type { SensorType } from '../../../types/dbTypes';
export { lerpHex } from '../../../utils/colourUtils';
/** The three configured stops of a sensor type's colour ramp. */
export interface ColourRamp {
    min: string;
    mid: string;
    max: string;
}
/** The numeric range the ramp is stretched over. `max` is always greater than `min`. */
export interface ColourDomain {
    min: number;
    max: number;
}
/** A single gradient stop. `offset` is a 0..1 fraction, not a percentage string. */
export interface ColourStop {
    offset: number;
    colour: string;
}
type RampSource = Pick<SensorType, 'name' | 'minColour' | 'midColour' | 'maxColour'>;
type DomainSource = Pick<SensorType, 'minValue' | 'maxValue'>;
/**
 * Colours for a sensor type, in precedence order: explicit overrides, then the DB row's
 * `min/mid/maxColour`, then the per-type default keyed by type name, then the global fallback.
 *
 * Note the spelling split this bridges: the DB columns are British (`minColour`) while the
 * `SensorChart` props they override are American (`minColor`).
 */
export declare function resolveRamp(type?: RampSource | null, overrides?: {
    min?: string;
    mid?: string;
    max?: string;
}): ColourRamp;
/** The min/max of the values actually observed, or null when there is nothing to measure. */
export declare function observedDomain(points: {
    value: number;
}[]): ColourDomain | null;
/**
 * The domain to stretch the ramp over: the sensor type's configured range when it is usable,
 * otherwise the observed range.
 *
 * Returns `null` when neither yields a range with width, which is the "no colours configured"
 * signal. Every consumer must fall back to its pre-colour appearance on `null` rather than
 * inventing a domain, so an unconfigured type keeps rendering exactly as it does today.
 */
export declare function resolveDomain(type?: DomainSource | null, observed?: ColourDomain | null): ColourDomain | null;
/**
 * The ramp colour for a value: min -> mid over the lower half of the domain, mid -> max over
 * the upper half. Values outside the domain clamp to its endpoint colours, so an out-of-range
 * reading reads as "at the limit" rather than wrapping around.
 */
export declare function colourForValue(value: number, ramp: ColourRamp, domain: ColourDomain): string;
/** 0..1 position of a value within the domain, for the legend caret. Clamped at both ends. */
export declare function valueOffset(value: number, domain: ColourDomain): number;
/** The domain's low, middle and high values, in ascending order, for legend tick labels. */
export declare function domainTicks(domain: ColourDomain): number[];
/** Legend ramp stops, left (min) to right (max). Pairs with a horizontal CSS `linear-gradient`. */
export declare function rampStops(ramp: ColourRamp): ColourStop[];
/**
 * Stops for the chart's vertical `<linearGradient y1="0" y2="1">`, where offset 0 is the top of
 * the plot box (the highest visible value) and offset 1 the bottom.
 *
 * The plot box spans `yDomain`, which is generally not the colour `domain`, so the ramp's own
 * breakpoints are projected onto the box and the ends are pinned to their clamped colours. Since
 * `colourForValue` is piecewise linear in value and offset is linear in value, interpolating
 * between these stops reproduces `colourForValue` exactly rather than approximating it.
 */
export declare function gradientStopsForYDomain(ramp: ColourRamp, domain: ColourDomain, yDomain: ColourDomain): ColourStop[];
//# sourceMappingURL=sensorColour.d.ts.map