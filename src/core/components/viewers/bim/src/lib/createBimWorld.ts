// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front";
import * as THREE from "three";

import { CurrentCamera } from "../CurrentCamera";
import { CurrentWorld } from "../CurrentWorld";
import { ShadowEnroller } from "../ShadowEnroller";
import { SunPath } from "../SunPath";

import { applyBimLighting, DEFAULT_BIM_LIGHTING } from "./bimLighting";
import { modelBounds } from "./modelBounds";
import { applyRenderMode, enablePostproduction, excludeFromPostproduction } from "./renderMode";

const FRAGMENTS_WORKER_URL =
    "https://thatopen.github.io/engine_fragment/resources/worker.mjs";

export type ShadowedBimWorld = OBC.SimpleWorld<
    OBC.ShadowedScene,
    OBC.OrthoPerspectiveCamera,
    OBF.PostproductionRenderer
>;

export interface BimWorldBootstrap {
    components: OBC.Components;
    world: ShadowedBimWorld;
    fragments: OBC.FragmentsManager;
    grid: OBC.SimpleGrid | null;
    /** Object URL for the fragments worker; the caller owns revoking it on teardown. */
    workerUrl: string;
}

async function createFragmentsWorkerUrl() {
    const response = await fetch(FRAGMENTS_WORKER_URL);
    const blob = await response.blob();
    const file = new File([blob], "worker.mjs", { type: "text/javascript" });
    return URL.createObjectURL(file);
}

/**
 * Builds the shadowed BIM world both viewers share: scene, postproduction renderer, camera,
 * grid, fragments worker and the shadow setup. Callers register their own components after.
 */
export async function createBimWorld(container: HTMLElement): Promise<BimWorldBootstrap> {
    const components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<
        OBC.ShadowedScene,
        OBC.OrthoPerspectiveCamera,
        OBF.PostproductionRenderer
    >();

    world.scene = new OBC.ShadowedScene(components);
    world.renderer = new OBF.PostproductionRenderer(components, container);
    world.camera = new OBC.OrthoPerspectiveCamera(components);

    components.init();

    const grids = components.get(OBC.Grids);
    const grid: OBC.SimpleGrid | null = grids.create(world) ?? null;

    const axes = new THREE.AxesHelper(5);
    world.scene.three.add(axes);

    const fragments = components.get(OBC.FragmentsManager);
    const workerUrl = await createFragmentsWorkerUrl();
    fragments.init(workerUrl);

    world.camera.controls.addEventListener("control", () => fragments.core.update());
    world.camera.controls.restThreshold = 0.005;
    world.camera.controls.addEventListener("rest", () => fragments.core.update(true));

    components.get(CurrentWorld).world = world;
    components.get(CurrentCamera).camera = world.camera;

    world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;
    world.scene.setup({ shadows: { cascade: 1, resolution: 1024 } });

    const shadows = components.get(ShadowEnroller);
    components.get(SunPath);

    enablePostproduction(world);

    shadows.excludeFromShadows(axes);
    excludeFromPostproduction(world, axes.material);

    if (grid) {
        world.scene.distanceRenderer.excludedObjects.add(grid.three);
        shadows.excludeFromShadows(grid.three);
        excludeFromPostproduction(world, grid.material);
        grid.config.visible = false;
    }

    applyBimLighting(world, DEFAULT_BIM_LIGHTING, modelBounds(components));
    applyRenderMode(world, "Shadowed");

    world.scene.three.background = null;

    return { components, world, fragments, grid, workerUrl };
}
