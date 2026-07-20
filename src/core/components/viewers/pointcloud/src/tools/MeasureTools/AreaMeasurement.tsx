"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import { PointCloudContext } from '../../../../../../store'
import { PointCloudTools } from '../../../../../../store/PointCloud/reducer'

interface AreaPointCloudType {
  currentMeasurements: any[];
  active: boolean;
}

//custom declarative component
export const AreaMeasurement = ({active = false, currentMeasurements = []} : AreaPointCloudType) => {
  const {state: pointCloudState, dispatch: pointCloudDispatch} = React.useContext(PointCloudContext);
  const {viewer} = pointCloudState.pointcloud

  React.useEffect(() => {
    if (!viewer) return

    if (active){
      // Begin insertion and store handle
      viewer.measuringTool.startInsertion({
        showDistances: false,
        showArea: true,
        closed: true,
        name: 'Area Measure'
      });

      viewer.renderer?.domElement?.focus();
    }
    else {
      try {
        // Tell MeasuringTool to stop insertion and clean its listeners
        viewer.dispatchEvent({ type: 'cancel_insertions' });

        // Optional cleanup: deselect handles & restore controls focus
        viewer.inputHandler?.deselectAll?.();
        viewer.renderer?.domElement?.focus();

      } catch (err) {
        console.warn('Cancel measuring failed:', err);
      }
    }
  }, [active, viewer])

  return null;
}

export default AreaMeasurement;