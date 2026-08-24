export declare const useOrganization: (id: string | null) => {
    organization: import("../..").Organization;
    isLoading: boolean;
    isError: any;
    updateOrganization: import("swr/mutation").TriggerWithOptionsArgs<import("../..").Organization, any, [string, string], Partial<import("../..").Organization>>;
    isMutating: boolean;
    updateError: any;
    updatedData: import("../..").Organization;
};
export declare const useOrganizationByName: (name: string | null) => {
    organization: import("../..").Organization;
    isLoading: boolean;
    isError: any;
};
export declare const useOrganizationRoles: (orgId: string | null) => {
    organizationRoles: import("../..").Role[];
    isLoading: boolean;
    isError: any;
};
//# sourceMappingURL=organizations.d.ts.map