//needs private instance to work
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { Sensor } from '../../types/dbTypes'

export function createSensorHooks(adapter: ApiAdapter) {
    //Call adapter methods inside hooks

    const useSensors = () => {
        const key = ["sensors"]; // no endpoint string
        const { data, error, isLoading } = useSWR<Sensor[]>(
            key,
            () => adapter.getSensors(),
        );
        return {
            sensors: data ?? [],
            isLoading,
            isError: error,
        };
    };

    const useSensorsByBuilding = (buildingId: number | null) => {
        const key = buildingId ? ["sensors", "building", buildingId] as const : null;
        const { data, error, isLoading } = useSWR<Sensor[]>(
            key,
            () => adapter.getSensorsByBuilding(buildingId as number),
        );
        return {
            sensors: data ?? [],
            isLoading,
            isError: error,
        }
    };

    const useSensor = (id: number | null) => {
        const key = id ? ["sensor", id] as const : null;
        const { data, error, isLoading } = useSWR<Sensor>(
            key,
            () => adapter.getSensor(id as number),
            //{ refreshInterval: 1000 } 
        );

        // SWR Mutation for updating a sensor
        const { trigger: updateSensor, isMutating, data: updatedData, error: updateError } = useSWRMutation(
            id ? ["updateSensor", id] : null,
            async (_key, { arg }: { arg: Partial<Sensor> }) =>
            adapter.updateSensor(id as number, arg),
            {
                onSuccess: (updatedSensor) => {
                    if (!id) return;
                    const prev = data; // Previous sensor data before update

                    // Revalidate the same keys used above
                    mutate(["sensor", id]);
                    mutate(["sensors"]);
                    // If buildingId or authorId changed --> Need to invalidate previous + current building and author lists 
                    if (prev?.buildingId) mutate(["sensors", "building", prev.buildingId]);
                    if (prev?.authorId) mutate(["sensors", "author", prev.authorId]);
                    if (updatedSensor.buildingId) mutate(["sensors", "building", updatedSensor.buildingId]);
                    if (updatedSensor.authorId) mutate(["sensors", "author", updatedSensor.authorId]);
                },
            }
        );

        const { trigger: deleteSensor, isMutating: isDeleting, error: deleteError } = useSWRMutation(
            id ? ["deleteSensor", id] as const : null,
            async () => await adapter.deleteSensor(id as number),
            {
            onSuccess: (deletedSensor) => {
                mutate(["sensor", deletedSensor.id], undefined, { revalidate: false });
                mutate(["sensors"]);
                if (deletedSensor.buildingId) mutate(["sensors", "building", deletedSensor.buildingId]);
                if (deletedSensor.authorId) mutate(["sensors", "author", deletedSensor.authorId]);
            },
            }
        );

        return {
        sensor: data ?? null,
        isLoading,
        isError: error,
        updateSensor,
        isMutating,
        updateError,
        updatedData,
        deleteSensor, 
        isDeleting, 
        deleteError
        };
    };

    const useCreateSensor = () => {
        const { trigger: createSensor, isMutating, data: createdData, error } = useSWRMutation(
            ["createSensor"],
            async (_key, { arg }: { arg: { sensorData: Partial<Sensor> } }) =>
            adapter.createSensor(arg),
            {
                onSuccess: (created) => {
                    // Revalidate cache lists that would include the new sensor
                    mutate(["sensors"]);
                    if (created.buildingId) mutate(["sensors", "building", created.buildingId]);
                    if (created.authorId) mutate(["sensors", "author", created.authorId]);

                },
            }
        );

        return {
            createSensor,
            isMutating,
            createError: error,
            createdData,
        };
    };

    const useSensorsByAuthor = (authorId: number | null) => {
        const key = authorId ? ["sensors", "author", authorId] as const : null;
        const { data, error, isLoading } = useSWR<Sensor[]>(
            key,
            () => adapter.getSensorsByAuthor(authorId as number),
        );
        return {
            sensors: data ?? [],
            isLoading,
            isError: error,
        };
    };

    // Return all hooks
    return {
        useSensors,
        useSensor,
        useSensorsByAuthor,
        useCreateSensor,
        useSensorsByBuilding
    };
}
