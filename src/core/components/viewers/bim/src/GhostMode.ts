// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as FRAGS from '@thatopen/fragments'
import * as THREE from 'three'

export class GhostMode extends OBC.Component {

    static readonly uuid = "156780ca-9815-4e0c-a166-44c12c2c17e9" as const

    enabled = false

    private originalColors = new Map<
        FRAGS.BIMMaterial,
        { color: number; transparent: boolean; opacity: number; lodOpacity?: number }
    >();

    private gridWasVisible = false;

    constructor(components: OBC.Components) {
        super(components)
        components.add(GhostMode.uuid, this)
    }

  setModelTransparent = (
    exclude?: THREE.Color[] | {
      excludeColors?: (THREE.Color | string)[];
      excludeHex?: number[];
      excludePredicate?: (material: FRAGS.BIMMaterial) => boolean;
    },
  ) => {
    const fragments = this.components.get(OBC.FragmentsManager);
    const materials = [...fragments.core.models.materials.list.values()];

    try {
      const grids = this.components.get(OBC.Grids);
      if (grids && grids.list.size > 0) {
        const firstGrid = [...grids.list.values()][0];
        this.gridWasVisible = firstGrid.three.visible;
        if (this.gridWasVisible) {
          firstGrid.three.visible = false;
        }
      }
    } catch (error) {
    }

    const hexSet = new Set<number>();
    if (Array.isArray(exclude)) {
      for (const c of exclude) hexSet.add(c.getHex());
    } else if (exclude) {
      if (exclude.excludeColors) {
        for (const c of exclude.excludeColors) {
          if (c instanceof THREE.Color) hexSet.add(c.getHex());
          else hexSet.add(new THREE.Color(c).getHex());
        }
      }
      if (exclude.excludeHex) for (const h of exclude.excludeHex) hexSet.add(h);
    }

    for (const material of materials) {
      const currentHex = 'color' in material ? material.color.getHex() : material.lodColor.getHex();

      if (exclude && !Array.isArray(exclude) && exclude.excludePredicate?.(material)) continue;

      if (hexSet.has(currentHex)) continue;

      if (!this.originalColors.has(material)) {
        let originalLodOpacity: number | undefined;
        if (material.uniforms && material.uniforms.lodOpacity) {
          originalLodOpacity = material.uniforms.lodOpacity.value;
        }
        this.originalColors.set(material, {
          color: currentHex,
          transparent: material.transparent,
          opacity: material.opacity,
          lodOpacity: originalLodOpacity,
        });
      }

      material.transparent = true;
      material.opacity = 0.15;
      material.needsUpdate = true;
      if ('color' in material) {
        material.color.setColorName('gray');
      } else {
        material.lodColor.setColorName('gray');
        if (material.uniforms && material.uniforms.lodOpacity) {
          material.uniforms.lodOpacity.value = 0.15;
        }
      }
    }
  };

    restoreModelMaterials = () => {
  try {
    const grids = this.components.get(OBC.Grids);
    if (grids && grids.list.size > 0 && this.gridWasVisible) {
      const firstGrid = [...grids.list.values()][0];
      firstGrid.three.visible = true;
      this.gridWasVisible = false;
    }
  } catch (error) {
  }

  for (const [material, data] of this.originalColors) {
    const { color, transparent, opacity, lodOpacity } = data;
    material.transparent = transparent;
    material.opacity = opacity;
    if ("color" in material) {
      material.color.setHex(color);
    } else {
      material.lodColor.setHex(color);
      if (material.uniforms && material.uniforms.lodOpacity && lodOpacity !== undefined) {
        material.uniforms.lodOpacity.value = lodOpacity;
      }
    }
    material.needsUpdate = true;
  }
  this.originalColors.clear();
};

toggleGhost = () => {
  if (this.originalColors.size) {
    this.restoreModelMaterials();
  } else {
    this.setModelTransparent();
  }
};

  /**
   * Apply or remove ghost (transparent) effect on a single model's materials
   * without affecting any other models in the scene.
   */
  setModelGhost = (model: FRAGS.FragmentsModel, ghost: boolean) => {
    const materials = new Set<FRAGS.BIMMaterial>()

    for (const mesh of model.tiles.values()) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        materials.add(mat as FRAGS.BIMMaterial)
      }
    }

    if (ghost) {
      for (const material of materials) {
        const currentHex = 'color' in material
          ? (material as THREE.MeshLambertMaterial).color.getHex()
          : (material as any).lodColor.getHex()

        if (!this.originalColors.has(material)) {
          let originalLodOpacity: number | undefined
          if ((material as any).uniforms?.lodOpacity) {
            originalLodOpacity = (material as any).uniforms.lodOpacity.value
          }
          this.originalColors.set(material, {
            color: currentHex,
            transparent: material.transparent,
            opacity: material.opacity,
            lodOpacity: originalLodOpacity,
          })
        }

        material.transparent = true
        material.opacity = 0.15
        material.needsUpdate = true
        if ('color' in material) {
          (material as THREE.MeshLambertMaterial).color.setColorName('gray')
        } else {
          (material as any).lodColor.setColorName('gray')
          if ((material as any).uniforms?.lodOpacity) {
            (material as any).uniforms.lodOpacity.value = 0.15
          }
        }
      }
    } else {
      for (const material of materials) {
        const data = this.originalColors.get(material)
        if (!data) continue

        material.transparent = data.transparent
        material.opacity = data.opacity
        if ('color' in material) {
          (material as THREE.MeshLambertMaterial).color.setHex(data.color)
        } else {
          (material as any).lodColor.setHex(data.color)
          if ((material as any).uniforms?.lodOpacity && data.lodOpacity !== undefined) {
            (material as any).uniforms.lodOpacity.value = data.lodOpacity
          }
        }
        material.needsUpdate = true
        this.originalColors.delete(material)
      }
    }

    const fragManager = this.components.get(OBC.FragmentsManager)
    fragManager.core.update(true)
  }

}