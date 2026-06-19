// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

//needs private instance to work
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { SensorType } from '../../types/dbTypes'

export function createSensorTypeHooks(adapter: ApiAdapter) {
    //Call adapter methods inside hooks

    const useSensorTypes = () => {
        const key = ["sensorTypes"]; // no endpoint string
        const { data, error, isLoading } = useSWR<SensorType[]>(
            key,
            () => adapter.getSensorTypes(),
        );
        return {
            sensorTypes: data ?? [],
            isLoading,
            isError: error,
        };
    };

    const useSensorType = (id: number) => {
        const key = id ? ["sensorType", id] as const : null;
        const { data, error, isLoading } = useSWR<SensorType>(
            key,
            () => adapter.getSensorType(id as number),
        );

        // SWR Mutation for updating a sensor type
        const { trigger: updateSensorType, isMutating, data: updatedData, error: updateError } = useSWRMutation(
            id ? ["updateSensorType", id] : null,
            async (_key, { arg }: { arg: Partial<SensorType> }) =>
            adapter.updateSensorType(id as number, arg),
            {
                onSuccess: () => {
                    if (!id) return;
                    // Revalidate the same keys used above
                    mutate(["sensorType", id]);
                    mutate(["sensorTypes"]);
                },
            }
        );

        const { trigger: deleteSensorType, isMutating: isDeleting, error: deleteError } = useSWRMutation(
            id ? ["deleteSensorType", id] as const : null,
            async () => await adapter.deleteSensorType(id as number),
            {
            onSuccess: (deletedSensorType) => {
                mutate(["sensorType", deletedSensorType.id], undefined, { revalidate: false });
                mutate(["sensorTypes"]);
            },
            }
        );

        return {
            sensorType: data ?? null,
            isLoading,
            isError: error,
            updateSensorType,
            isMutating,
            updateError,
            updatedData,
            deleteSensorType, 
            isDeleting, 
            deleteError
        };
    }

    const useCreateSensorType = () => {
        const { trigger: createSensorType, isMutating, data: createdData, error } = useSWRMutation(
            ["createSensorType"],
            async (_key, { arg }: { arg: { sensorTypeData: Partial<SensorType> } }) =>
            adapter.createSensorType(arg),
            {
                onSuccess: () => {
                    mutate(["sensorTypes"]);
                },
            }
        );

        return {
            createSensorType,
            isMutating,
            createError: error,
            createdData,
        };
    };

    return { useSensorTypes, useSensorType, useCreateSensorType };
};