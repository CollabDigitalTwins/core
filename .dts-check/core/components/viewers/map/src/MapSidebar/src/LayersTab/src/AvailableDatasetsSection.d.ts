import * as React from 'react';
import type { Dataset } from '../../../../../../../../types/datasetTypes';
interface AvailableDatasetsSectionProps {
    query: string;
    allDatasets: Dataset[];
    nationalDatasets: Dataset[];
    subdivisionDatasets: Dataset[];
    municipalDatasets: Dataset[];
    organizationalDatasets: Dataset[];
    liveDatasets: Dataset[];
    showMunicipal: boolean;
    favourites: Dataset[];
    onFavouriteToggle: (dataset: Dataset) => void;
}
export declare function AvailableDatasetsSection({ query, allDatasets, nationalDatasets, subdivisionDatasets, municipalDatasets, organizationalDatasets, liveDatasets, showMunicipal, favourites, onFavouriteToggle, }: AvailableDatasetsSectionProps): React.JSX.Element;
export {};
//# sourceMappingURL=AvailableDatasetsSection.d.ts.map