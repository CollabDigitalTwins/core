import * as React from "react";
import type { filterFieldOptions } from '../utils/Columns';
type FiltersDialogProps = {
    filterFields?: filterFieldOptions[];
    filters: any[];
    activeFilters: any[];
    setFilters: React.Dispatch<React.SetStateAction<any[]>>;
    setActiveFilters: React.Dispatch<React.SetStateAction<any[]>>;
    onApplyFilters: (filters: any[]) => void;
    data?: any[];
    isBuilding?: boolean;
};
declare const FiltersDialog: ({ filters, filterFields: providedFilterFields, activeFilters, setFilters, onApplyFilters, setActiveFilters, data, isBuilding, }: FiltersDialogProps) => React.JSX.Element;
export default FiltersDialog;
//# sourceMappingURL=FiltersDialog.d.ts.map