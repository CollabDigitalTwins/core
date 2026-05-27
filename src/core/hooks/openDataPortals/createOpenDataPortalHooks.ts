import useSWR, { mutate } from "swr";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { OpenDataPortal, DatasetGroup } from "../../types/dbTypes";
import useSWRMutation from "swr/mutation";

export function createOpenDataPortalHooks(adapter: ApiAdapter) {
  // Call adapter methods inside hooks
  
  const useOpenDataPortals = () => {
    const key = ["openDataPortals"];
    const { data, error, isLoading } = useSWR<OpenDataPortal[]>(key, () => adapter.listOpenDataPortals());
    return { openDataPortals: data ?? [], isLoading, isError: error };
  };

  const useOpenDataPortalById = (id: number | null) => {
    const key = id ? (["openDataPortal", id] as const) : null;
    const { data, error, isLoading } = useSWR<OpenDataPortal>(key, () => adapter.getOpenDataPortal(id as number));
    return { openDataPortal: data ?? null, isLoading, isError: error };
  };

  const useCreateOpenDataPortal = () => {
    const { trigger: createOpenDataPortal, isMutating, data: createdData, error } = useSWRMutation(
      ["createOpenDataPortal"],
      async (_k, { arg }: { arg: Partial<OpenDataPortal> }) => adapter.createOpenDataPortal(arg),
      {
        onSuccess: () => {
          mutate(["openDataPortals"]);
        },
      }
    );

    return { createOpenDataPortal, isMutating, createError: error, createdData };
  };

  const useOpenDataPortalsByMunicipality = (municipality: string | null) => {
    const key = municipality ? (["openDataPortalsByMunicipality", municipality] as const) : null;
    const { data, error, isLoading } = useSWR<OpenDataPortal[]>(
      key,
      () => adapter.listOpenDataPortalsByMunicipality(municipality as string)
    );
    return { openDataPortals: data ?? [], isLoading, isError: error };
  };

  const useOpenDataPortalsByMunicipalityAndCountrySubdivision = (
    municipality: string | null,
    countrySubdivision: string | null
  ) => {
    const key = municipality && countrySubdivision ? (["openDataPortalsByMunicipalityCountrySubdivision", municipality, countrySubdivision] as const) : null;
    const { data, error, isLoading } = useSWR<OpenDataPortal[]>(
      key,
      () => adapter.listOpenDataPortalsByMunicipalityAndCountrySubdivision(municipality as string, countrySubdivision as string)
    );
    return { openDataPortals: data ?? [], isLoading, isError: error };
  };

  const useOpenDataPortalsByCountrySubdivision = (countrySubdivision: string | null) => {
    const key = countrySubdivision ? (["openDataPortalsByCountrySubdivision", countrySubdivision] as const) : null;
    const { data, error, isLoading } = useSWR<OpenDataPortal[]>(
      key,
      () => adapter.listOpenDataPortalsByCountrySubdivision(countrySubdivision as string)
    );
    return { openDataPortals: data ?? [], isLoading, isError: error };
  };

  const useOpenDataPortalsByGroup = (group: DatasetGroup | null) => {
    const key = group ? (["openDataPortalsByGroup", group] as const) : null;
    const { data, error, isLoading } = useSWR<OpenDataPortal[]>(
      key,
      () => adapter.listOpenDataPortalsByGroup(group as DatasetGroup)
    );
    return { openDataPortals: data ?? [], isLoading, isError: error };
  };

  const useOpenDataPortalsByName = (name: string | null) => {
    const key = name ? (["openDataPortalsByName", name] as const) : null;
    const { data, error, isLoading } = useSWR<OpenDataPortal[]>(
      key,
      () => adapter.listOpenDataPortalsByName(name as string)
    );
    return { openDataPortals: data ?? [], isLoading, isError: error };
  };

  return {
    useOpenDataPortals,
    useOpenDataPortalById,
    useCreateOpenDataPortal,
    useOpenDataPortalsByMunicipality,
    useOpenDataPortalsByMunicipalityAndCountrySubdivision,
    useOpenDataPortalsByCountrySubdivision,
    useOpenDataPortalsByGroup,
    useOpenDataPortalsByName,
  };
}
