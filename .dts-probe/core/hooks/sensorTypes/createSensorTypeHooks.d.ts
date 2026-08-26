import type { SensorType } from '../../types/dbTypes';
import type { ApiAdapter } from "../ports/apiAdapter";
export declare function createSensorTypeHooks(adapter: ApiAdapter): {
    useSensorTypes: () => {
        sensorTypes: SensorType[];
        isLoading: boolean;
        isError: any;
    };
    useSensorType: (id: number) => {
        sensorType: SensorType;
        isLoading: boolean;
        isError: any;
        updateSensorType: import("swr/mutation").TriggerWithOptionsArgs<SensorType, any, [string, number], Partial<SensorType>>;
        isMutating: boolean;
        updateError: any;
        updatedData: SensorType;
        deleteSensorType: import("swr/mutation").TriggerWithoutArgs<SensorType, any, readonly ["deleteSensorType", number], never>;
        isDeleting: boolean;
        deleteError: any;
    };
    useCreateSensorType: () => {
        createSensorType: import("swr/mutation").TriggerWithOptionsArgs<SensorType, any, [string], {
            sensorTypeData: Partial<SensorType>;
        }>;
        isMutating: boolean;
        createError: any;
        createdData: SensorType;
    };
};
//# sourceMappingURL=createSensorTypeHooks.d.ts.map