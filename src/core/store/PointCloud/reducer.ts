// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { CameraMode } from "../../components/viewers/pointcloud/define";

import type { ActionMap } from "../ActionMap";

export enum PointCloudTools {
  NONE = 'NONE',
  LINE_MEASUREMENT = 'DISTANCE_MEASUREMENT',
  ANGLE_MEASUREMENT = 'ANGLE_MEASUREMENT',
  AREA_MEASUREMENT = 'AREA_MEASUREMENT',
  VOLUME_MEASUREMENT = 'VOLUME_MEASUREMENT',

  CLIPPING_PLANE = 'CLIPPING_PLANE',
  CLIPPING_BOX = 'CLIPPING_BOX',
}

export enum CameraControl {
  EARTH_CONTROL = 'earth-control',
  ORBIT_CONTROL = 'orbit-control',
  FIRST_PERSON = 'first-person-control'
}

export interface PointCloudState {
  ready: boolean;
  viewer: any; //potree doesn't have type annoation, so we use type any here
  activeTool: PointCloudTools;
  cameraProjection: CameraMode;
  cameraControl: CameraControl;
  moveSpeed: number;
  lockElevation: boolean;
  loadedPointCloudIds: string[];
}

export const initialPointCloudState: PointCloudState = {
  ready: false,
  viewer: null,
  activeTool: PointCloudTools.NONE,
  cameraProjection: CameraMode.PERSPECTIVE,
  cameraControl: CameraControl.ORBIT_CONTROL,
  moveSpeed: 1,
  lockElevation: false,
  loadedPointCloudIds: [],
};

export type PointCloudPayload = {
  ["INIT"]: { initialState: Partial<PointCloudState> }
  ["SET_READY"]: { ready: boolean }
  ["SET_ACTIVE_TOOL"]: {activeTool: PointCloudTools}
  ["SET_CAMERA_PROJECTION"]: {cameraProjection: CameraMode}
  ["SET_CAMERA_CONTROL"]: {cameraControl: CameraControl}
  ["SET_MOVE_SPEED"]: {moveSpeed: number}
  ["SET_LOCK_ELEVATION"]: {lockElevation: boolean}
  ["LOAD_POINT_CLOUD"]: { id: string }
  ["UNLOAD_POINT_CLOUD"]: { id: string }
};

export type PointCloudActions =
  ActionMap<PointCloudPayload>[keyof ActionMap<PointCloudPayload>];

export const PointCloudReducer = (
  state: PointCloudState,
  action: PointCloudActions
): PointCloudState => {
  switch (action.type) {
    case "INIT":
      return { ...state, ...action.payload.initialState };
    case "SET_READY":
      return {...state, ready: action.payload.ready}
    case "SET_ACTIVE_TOOL":
      return {...state, activeTool: action.payload.activeTool}
    case "SET_CAMERA_PROJECTION":
      return {...state, cameraProjection: action.payload.cameraProjection}
    case "SET_CAMERA_CONTROL":
      return {...state, cameraControl: action.payload.cameraControl}
    case "SET_MOVE_SPEED":
      return {...state, moveSpeed: action.payload.moveSpeed}
    case "SET_LOCK_ELEVATION":
      return {...state, lockElevation: action.payload.lockElevation}
    case "LOAD_POINT_CLOUD":
      if (state.loadedPointCloudIds.includes(action.payload.id)) return state;
      return { ...state, loadedPointCloudIds: [...state.loadedPointCloudIds, action.payload.id] }
    case "UNLOAD_POINT_CLOUD":
      return { ...state, loadedPointCloudIds: state.loadedPointCloudIds.filter(id => id !== action.payload.id) }
    default:
      return state;
  }
};
