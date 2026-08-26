import * as React from "react";
import type { BimActions, BimState } from './reducer';
type InitialStateType = {
    bim: BimState;
};
export declare const BimContext: React.Context<{
    state: InitialStateType;
    dispatch: React.Dispatch<BimActions>;
}>;
export declare const BimProvider: React.FC<React.PropsWithChildren>;
export declare const useBimContext: () => {
    state: InitialStateType;
    dispatch: React.Dispatch<BimActions>;
};
export {};
//# sourceMappingURL=context.d.ts.map