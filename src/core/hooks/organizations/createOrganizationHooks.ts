// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

//needs private instance to work
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";

import type { Organization, Role } from '../../types/dbTypes'
import type { ApiAdapter } from "../ports/apiAdapter";

export function createOrganizationHooks(adapter: ApiAdapter) {
    //Call adapter methods inside hooks

    const useOrganization = (id: string | null) => {
        const key = id ? ["organization", id] as const : null;
        const { data, error, isLoading } = useSWR<Organization>(
            key,
            () => adapter.getOrganization(id as string),
        );

        const { trigger: updateOrganization, isMutating, data: updatedData, error: updateError } = useSWRMutation(
            id ? ["updateOrganization", id] : null,
            async (_k, { arg }: { arg: Partial<Organization> }) => adapter.updateOrganization(id as string, arg),
            {
            onSuccess: (updatedOrg) => {
                if (!id) return;
                void mutate(["organization", id]);
                if (updatedOrg.name) void mutate(["organizationByName", updatedOrg.name]); // only need to update from previous data if name can be changed.
            },
            }
        );

        return {
            organization: data ?? null,
            isLoading,
            isError: error,
            updateOrganization,
            isMutating,
            updateError,
            updatedData,
        };
    };

    const useOrganizationByName = (name: string | null) => {
        const key = name ? ["organizationByName", name] as const : null;
        const { data, error, isLoading } = useSWR<Organization>(
            key,
            () => adapter.getOrganizationByName(name as string),
        );

        return {
            organization: data ?? null,
            isLoading,
            isError: error,
        };
    };

    const useOrganizationRoles = (orgId: string | null) => {
        const key = orgId ? (["organizationRoles", orgId] as const) : null;
        const { data, error, isLoading } = useSWR<Role[]>(key, () => adapter.getOrganizationRoles(orgId as string));
        return { organizationRoles: data ?? [], isLoading, isError: error };
    };

    return {
        useOrganization,
        useOrganizationByName,
        useOrganizationRoles,
    };
}