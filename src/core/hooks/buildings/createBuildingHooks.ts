//needs private instance to work
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { Building } from '../../types/dbTypes'

export function createBuildingHooks(adapter: ApiAdapter) {
    //Call adapter methods inside hooks

    const useBuildings = () => {
        const key = ["buildings"]; // no endpoint string
        const { data, error, isLoading } = useSWR<Building[]>(
            key,
            () => adapter.getBuildings(),
        );
        return {
            buildings: data ?? [],
            isLoading,
            isError: error,
        };
    };

    const useBuilding = (id: number | null) => {
        const key = id ? ["building", id] as const : null;
        const { data, error, isLoading } = useSWR<Building>(
            key,
            () => adapter.getBuilding(id as number),
        );

        // SWR Mutation for updating a building
        const { trigger: updateBuilding, isMutating, data: updatedData, error: updateError } = useSWRMutation(
            id ? ["updateBuilding", id] : null,
            async (_key, { arg }: { arg: Partial<Building> }) =>
            adapter.updateBuilding(id as number, arg),
            {
                onSuccess: () => {
                    if (!id) return;
                    // Revalidate the same keys used above, not endpoints
                    mutate(["building", id]);
                    mutate(["buildings"]);
                    mutate(["filesByBuilding", id, ""]); // Another hook for files-by-building
                },
            }
        );

        return {
        building: data ?? null,
        isLoading,
        isError: error,
        updateBuilding,
        isMutating,
        updateError,
        updatedData,
        };
    };

    const useCreateBuilding = () => {
        const { trigger: createBuilding, isMutating, data: createdData, error } = useSWRMutation(
            ["createBuilding"],
            async (_key, { arg }: { arg: { buildingData: Partial<Building>, organizationId: string } }) =>
            adapter.createBuilding(arg),
            {
                onSuccess: () => {
                    // Same idea: revalidate keys, not endpoints
                    mutate(["buildings"]);
                },
            }
        );

        return {
            createBuilding,
            isMutating,
            createError: error,
            createdData,
        };
    };

    // OSM id hooks
    const useBuildingsByOsm = (buildingOsmId: number | null) => {
        const key = buildingOsmId ? ["buildingsByOsm", buildingOsmId] as const : null;
        const { data, error, isLoading } = useSWR<Building[]>(
            key,
            () => adapter.getBuildingsByOsm(buildingOsmId as number),
        );
        return {
            buildings: data ?? [],
            isLoading,
            isError: error,
        };
    };

    const useBuildingOsmIds = () => {
        const key = ["buildingOsmIds"];
        const { data, error, isLoading } = useSWR<number[]>(
            key,
            () => adapter.getBuildingOsmIds(),
        );
        return {
            osmIds: data ?? [],
            isLoading,
            isError: error,
        };
    };

    // Return all hooks
    return {
        useBuildings,
        useBuilding,
        useBuildingsByOsm,
        useBuildingOsmIds,
        useCreateBuilding,
    };
}
