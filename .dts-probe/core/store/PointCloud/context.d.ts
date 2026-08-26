import * as React from "react";
import type { PointCloudState, PointCloudActions } from "./reducer";
type InitialStateType = {
    pointcloud: PointCloudState;
};
export declare const PointCloudContext: React.Context<{
    state: InitialStateType;
    dispatch: React.Dispatch<PointCloudActions>;
}>;
export declare const PointCloudProvider: React.FC<React.PropsWithChildren>;
export declare const usePointCloudContext: () => {
    state: InitialStateType;
    dispatch: React.Dispatch<PointCloudActions>;
};
export {};
//# sourceMappingURL=context.d.ts.map