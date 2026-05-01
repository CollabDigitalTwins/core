import * as OBC from "@thatopen/components";
import * as THREE from "three";


export interface CustomCreateViewFromIfcStoreysConfig extends OBC.CreateViewFromIfcStoreysConfig {
  /**
   * The unit for storey elevation values: "mm" (default) or "m".
   */
  unit?: "mm" | "m";
}

export class CustomOBCViews extends OBC.Views {
  constructor(components: OBC.Components) {
    super(components);
  }

  async createFromIfcStoreys(config?: OBC.CreateViewFromIfcStoreysConfig) {
    const result: OBC.View[] = [];
    const fragments = this.components.get(OBC.FragmentsManager);
    const offset = config?.offset === undefined ? 0.25 : config.offset;

    for (const [modelId, model] of fragments.list) {
      if (
        config?.modelIds &&
        !config.modelIds.some((regex) => regex.test(modelId))
      ) {
        continue;
      }

      const storeys = Object.values(
        await model.getItemsOfCategories([/BUILDINGSTOREY/]),
      ).flat();

      if (storeys.length === 0) continue;

      const storeysData = await model.getItemsData(storeys);
      const [, coordHeight] = await model.getCoordinates();
      const normal = new THREE.Vector3(0, -1, 0);

      // Calculate model bounds and center for robust positioning
      const box = model.box;
      const center = new THREE.Vector3();
      box.getCenter(center);
      const minY = box.min.y;
      const maxY = box.max.y;

      for (const storey of storeysData) {
        if (!("value" in storey.Name && "value" in storey.Elevation)) continue;

        const { value: name } = storey.Name;
        if (
          config?.storeyNames &&
          !config.storeyNames.some((value) => value.test(name))
        ) {
          continue;
        }

        let elevation = storey.Elevation.value;

        // 1. Unit Correction (mm -> m)
        // If elevation is way outside the model bounds (e.g. > 100m above max), it's likely mm
        // We check if dividing by 1000 brings it closer to the model range
        if (elevation > maxY + 200 || elevation < minY - 200) {
             if (elevation / 1000 > minY - 50 && elevation / 1000 < maxY + 50) {
                 elevation /= 1000;
             }
        }

        // 2. Coordinate System Correction (Relative vs Absolute)
        // Try adding coordHeight
        const elevWithCoord = elevation + coordHeight;
        
        // Determine which one is closer to the model's vertical range
        let finalHeight = elevation;
        
        const inBoundsRaw = (elevation >= minY - 10 && elevation <= maxY + 10);
        const inBoundsCoord = (elevWithCoord >= minY - 10 && elevWithCoord <= maxY + 10);

        if (inBoundsCoord && !inBoundsRaw) {
            finalHeight = elevWithCoord;
        } else if (inBoundsRaw && !inBoundsCoord) {
            finalHeight = elevation;
        } else {
            // Fallback to standard behavior (add coordHeight) if ambiguous
            finalHeight = elevWithCoord; 
        }

        // Apply offset
        finalHeight += offset;

        const plane = new THREE.Plane(normal, finalHeight);
        const view = this.createFromPlane(plane, {
          id: name,
          world: config?.world,
        });

        // 3. Camera Centering
        // Crucial: Center the camera on the model's X/Z center
        // The standard createFromPlane puts camera at (0, height, 0)
        if (view.camera && view.camera.three) {
             view.camera.three.position.set(center.x, finalHeight, center.z);
             view.camera.three.updateMatrixWorld();
             
             // Also update controls target if available in the view data
             // The View class stores 'controls' state which usually has 'target'
             if (view.camera.controls) {
                 // @ts-ignore
                 if (view.camera.controls.target) {
                     // @ts-ignore
                     view.camera.controls.target.set(center.x, finalHeight - 1, center.z);
                 }
             }
        }

        result.push(view);
      }
    }

    return result;
  }
}

