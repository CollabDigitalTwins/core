import type { Feature } from 'geojson';
export declare const peliasAutocomplete: (text: string, countryCode: string | undefined, size: number) => Promise<Feature[]>;
export declare const peliasReverse: (latitude: string, longitude: string, countryCode: string | undefined, { size, coarse, layers }: {
    size: number;
    coarse: boolean;
    layers?: string;
}) => Promise<Feature[]>;
//# sourceMappingURL=pelias.d.ts.map