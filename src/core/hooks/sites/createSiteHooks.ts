// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { Site } from "../../types/dbTypes";

type SiteUpdateInput = Partial<Site> & {
  siteBuildings?: {
    connect?: { id: number }[];
    disconnect?: { id: number }[];
  };
};

export function createSiteHooks(adapter: ApiAdapter) {
  // Call adapter methods inside hooks
  
  const useSites = () => {
    const key = ["sites"];
    const { data, error, isLoading } = useSWR<Site[]>(key, () => adapter.listSites());
    return { sites: data ?? [], isLoading, isError: error };
  };

  const useSite = (siteId: string) => {
    const key = siteId ? (["site", siteId] as const) : null;
    const { data, error, isLoading } = useSWR<Site>(key, () => adapter.getSite(siteId));

    const { trigger: updateSite, isMutating, data: updatedData, error: updateError } = useSWRMutation(
      siteId ? ["updateSite", siteId] : null,
      async (_k, { arg }: { arg: SiteUpdateInput }) => adapter.updateSite(siteId, arg),
      {
        onSuccess: () => {
          mutate(["site", siteId]);
          mutate(["sites"]);
          // NOTE: intentionally not revalidating ["buildings"] — associating a
          // building to a site doesn't change the buildings list's displayed
          // data, and revalidating it re-renders the always-mounted map's
          // building layer (a heavy, jank-inducing churn after bulk associate).
        },
      }
    );

    return { site: data ?? null, isLoading, isError: error, updateSite, isMutating, updateError, updatedData };
  };

  const useCreateSite = () => {
    const { trigger: createSite, isMutating, data: createdData, error } = useSWRMutation(
      ["createSite"],
      async (_k, { arg }: { arg: Partial<Site> }) => adapter.createSite(arg),
      {
        onSuccess: () => {
          mutate(["sites"]);
        },
      }
    );

    return { createSite, isMutating, createError: error, createdData };
  };

  const useDeleteSite = (siteId?: number | string) => {
    const { trigger, isMutating, data, error } = useSWRMutation(
      siteId ? ["deleteSite", String(siteId)] : ["deleteSite"],
      async (_k, { arg }: { arg: string | number }) => adapter.deleteSite(arg)
    );

    const deleteSite = async (id: string | number) => {
      await trigger(id);
      mutate(["sites"]);
      mutate(["buildings"]) // Revalidate buildings in case any were associated with the deleted site
    };

    return { deleteSite, isMutating, deleteError: error, deletedData: data };
  };

  return { 
    useSites, 
    useSite, 
    useCreateSite, 
    useDeleteSite 
  };
}
