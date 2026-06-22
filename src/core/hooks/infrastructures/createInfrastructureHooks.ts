// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { Infrastructure } from "../../types/dbTypes";

export function createInfrastructureHooks(adapter: ApiAdapter) {
  // Call adapter methods inside hooks
  
  const useInfrastructures = () => {
    const key = ["infrastructures"];
    const { data, error, isLoading } = useSWR<Infrastructure[]>(key, () => adapter.listInfrastructure());
    return { infrastructures: data ?? [], isLoading, isError: error };
  };

  const useInfrastructure = (infrastructureId: number) => {
    const key = infrastructureId ? (["infrastructure", infrastructureId] as const) : null;
    const { data, error, isLoading } = useSWR<Infrastructure>(key, () => adapter.getInfrastructure(infrastructureId));

    const { trigger: updateInfrastructure, isMutating, data: updatedData, error: updateError } = useSWRMutation(
      infrastructureId ? ["updateInfrastructure", infrastructureId] : null,
      async (_k, { arg }: { arg: Partial<Infrastructure> }) => adapter.updateInfrastructure(infrastructureId, arg),
      {
        onSuccess: () => {
          mutate(["infrastructure", infrastructureId]);
          mutate(["infrastructures"]);
        },
      }
    );

    return { infrastructure: data ?? null, isLoading, isError: error, updateInfrastructure, isMutating, updateError, updatedData };
  };

  const useCreateInfrastructure = () => {
    const { trigger: createInfrastructure, isMutating, data: createdData, error } = useSWRMutation(
      ["createInfrastructure"],
      async (_k, { arg }: { arg: Partial<Infrastructure> }) => adapter.createInfrastructure(arg),
      {
        onSuccess: () => {
          mutate(["infrastructures"]);
        },
      }
    );

    return { createInfrastructure, isMutating, createError: error, createdData };
  };

  const useDeleteInfrastructure = (infrastructureId?: number | string) => {
    const { trigger, isMutating, data, error } = useSWRMutation(
      infrastructureId ? ["deleteInfrastructure", infrastructureId] : ["deleteInfrastructure"],
      async (_k, { arg }: { arg: number }) => adapter.deleteInfrastructure(arg)
    );

    const deleteInfrastructure = async (id: number) => {
      await trigger(id);
      mutate(["infrastructures"]);
    };

    return { deleteInfrastructure, isMutating, deleteError: error, deletedData: data };
  };

  return { 
    useInfrastructures, 
    useInfrastructure, 
    useCreateInfrastructure, 
    useDeleteInfrastructure 
  };
}
