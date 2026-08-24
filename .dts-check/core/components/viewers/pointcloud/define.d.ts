/** Camera projection / mode */
export declare const enum CameraMode {
    ORTHOGRAPHIC = 0,
    PERSPECTIVE = 1,
    VR = 2
}
/** How clipping volumes affect rendering */
export declare const enum ClipTask {
    NONE = 0,
    HIGHLIGHT = 1,
    SHOW_INSIDE = 2,
    SHOW_OUTSIDE = 3
}
/** Whether a point is kept if it's inside ANY or ALL clipping volumes */
export declare const enum ClipMethod {
    INSIDE_ANY = 0,
    INSIDE_ALL = 1
}
/** Elevation shader gradient wrap mode */
export declare const enum ElevationGradientRepeat {
    CLAMP = 0,
    REPEAT = 1,
    MIRRORED_REPEAT = 2
}
/** Mouse buttons as bit flags */
export declare const enum MOUSE {
    LEFT = 1,
    RIGHT = 2,
    MIDDLE = 4
}
/** Point size attenuation mode */
export declare const enum PointSizeType {
    FIXED = 0,
    ATTENUATED = 1,
    ADAPTIVE = 2
}
/** Point sprite shape */
export declare const enum PointShape {
    SQUARE = 0,
    CIRCLE = 1,
    PARABOLOID = 2
}
/** Acceleration structure type */
export declare const enum TreeType {
    OCTREE = 0,
    KDTREE = 1
}
/**
 * Units: enum + metadata map (enums can’t hold object values).
 * Use LengthUnit for typing, and LENGTH_UNIT_META for code & scale.
 */
export declare const enum LengthUnit {
    METER = "METER",
    FEET = "FEET",
    INCH = "INCH"
}
export type LengthUnitInfo = {
    code: string;
    unitsPerMeter: number;
};
export declare const LENGTH_UNIT_META: Record<LengthUnit, LengthUnitInfo>;
export declare const metersTo: (valueInMeters: number, unit: LengthUnit) => number;
export declare const toMeters: (value: number, unit: LengthUnit) => number;
//# sourceMappingURL=define.d.ts.map