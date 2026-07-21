"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import {
  PointCloudReducer,
  initialPointCloudState,
} from "./reducer";

import type {
  PointCloudState,
  PointCloudActions} from "./reducer";

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
  const value = React.useMemo(() => ({ state, dispatch }), [state]);
  return (
    <PointCloudContext.Provider value={value}>
      {children}
    </PointCloudContext.Provider>
  );
};

export const usePointCloudContext = () => React.useContext(PointCloudContext);