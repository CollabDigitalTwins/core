"use client"

import * as React from "react";
import {
  PointCloudState,
  PointCloudActions,
  PointCloudReducer,
  initialPointCloudState,
} from "./reducer";

type InitialStateType = {
  pointcloud: PointCloudState;
};

const initialState: InitialStateType = {
  pointcloud: initialPointCloudState,
};

const reducer = ({ pointcloud }: InitialStateType, action: PointCloudActions) => ({
    pointcloud: PointCloudReducer(pointcloud, action),
  });

export const PointCloudContext = React.createContext<{
  state: InitialStateType;
  dispatch: React.Dispatch<PointCloudActions>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const PointCloudProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  // Audit Phase 1.A (F-3): memoize value — see AppConfig/context.tsx note.
  const value = React.useMemo(() => ({ state, dispatch }), [state]);
  return (
    <PointCloudContext.Provider value={value}>
      {children}
    </PointCloudContext.Provider>
  );
};

export const usePointCloudContext = () => React.useContext(PointCloudContext);