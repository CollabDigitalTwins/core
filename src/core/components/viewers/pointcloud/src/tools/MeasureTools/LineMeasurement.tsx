"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { PointCloudContext } from '../../../../../../store'
import { PointCloudTools } from '../../../../../../store/PointCloud/reducer'

interface MeasurePointCloudType {
  currentMeasurements: any[];
  active: boolean;
}

//custom declarative component 
const LineMeasurement = ({active = false, currentMeasurements = []} : MeasurePointCloudType) => {
  const {state: pointCloudState, dispatch: pointCloudDispatch} = React.useContext(PointCloudContext);
  const {viewer} = pointCloudState.pointcloud
  
  React.useEffect(() => {
    if (!viewer) return

    if (active){
      // Begin insertion and store handle
      viewer.measuringTool.startInsertion({
        showDistances: true,
        showArea: false,
        closed: false,
        name: 'Line Measure'
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

    return () => {
      if (viewer) {
          viewer.dispatchEvent({ type: 'cancel_insertions' });

        // Optional cleanup: deselect handles & restore controls focus
        viewer.inputHandler?.deselectAll?.();
        viewer.renderer?.domElement?.focus();
      }
    }

  }, [active, viewer])
  
  return null;
}

export default LineMeasurement;