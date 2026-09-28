// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as OBC from "@thatopen/components";

const CAMERA_PARAMS = ["camX", "camY", "camZ", "tarX", "tarY", "tarZ"] as const;

const DEFAULT_LOOK_AT = [20, 40, 40, -30, 10, -5] as const;

function sharedLookAt(searchParams: URLSearchParams): number[] | null {
    const values = CAMERA_PARAMS.map(key => Number.parseFloat(searchParams.get(key) ?? ""));
    return values.every(Number.isFinite) ? values : null;
}

export function setCameraLookAt(world: OBC.World, searchParams: URLSearchParams) {
    const shared = sharedLookAt(searchParams);
    const [camX, camY, camZ, tarX, tarY, tarZ] = shared ?? DEFAULT_LOOK_AT;
    void world.camera.controls.setLookAt(camX, camY, camZ, tarX, tarY, tarZ, true);
    return { sharing: shared !== null, cameraPosition: { x: camX, y: camY, z: camZ }, targetPosition: { x: tarX, y: tarY, z: tarZ } };
}
