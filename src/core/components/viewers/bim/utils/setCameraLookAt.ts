// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

            import * as OBC from "@thatopen/components";

            export function setCameraLookAt(world: OBC.World, searchParams: URLSearchParams) {
                const camX = Number(searchParams.get("camX"));
                const camY = Number(searchParams.get("camY"));
                const camZ = Number(searchParams.get("camZ"));
                const tarX = Number(searchParams.get("tarX"));
                const tarY = Number(searchParams.get("tarY"));
            const tarZ = Number(searchParams.get("tarZ"));
           if (world && camX && camY && camZ && tarX && tarY && tarZ) {
                    world.camera.controls.setLookAt(camX, camY, camZ, tarX, tarY, tarZ, true);
                    return {sharing: true, cameraPosition: { x: camX, y: camY, z: camZ }, targetPosition: { x: tarX, y: tarY, z: tarZ } };
                }
            else {world.camera.controls.setLookAt(20, 40, 40, -30, 10, -5, true); 
                return {sharing: false, cameraPosition: { x: 20, y: 40, z: 10 }, targetPosition: { x: -30, y: 10, z: -5 } }};
            }