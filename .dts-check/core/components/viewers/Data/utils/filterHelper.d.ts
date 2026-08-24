type FilterType = {
    id: number;
    field: string;
    fieldType: 'boolean' | 'string' | 'number' | 'date' | 'enum';
    operator: 'isTrue' | 'isFalse' | 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'before' | 'after' | 'inList';
    value: boolean | string | number | Date | string[];
    secondValue: number | Date | null;
};
export declare function getUniqueColumnValues(data: any[], columnId: string): any[];
export declare function filterHelper(data: any[], filters: FilterType[]): any[];
export declare const getNarrowedFilterOptions: (data: any[], baseOptions: any[], currentFiltersState: any[]) => any[];
export {};
//# sourceMappingURL=filterHelper.d.ts.map