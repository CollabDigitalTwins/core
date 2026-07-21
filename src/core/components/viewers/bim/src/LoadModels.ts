// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from "@thatopen/components";

import { CameraProjection } from "./CameraProjection";
import { CurrentWorld } from "./CurrentWorld";
import { FitCamera } from "./FitCamera";
import { SpatialStructure } from "./SpatialStructure";

import type * as FRAGS from "@thatopen/fragments";
import type * as THREE from "three";

export class LoadModels extends OBC.Component {

    static readonly uuid = "4927c1cc-af40-4ef9-8010-c0a1111987b1" as const;

    enabled = false;

    // Events for loading states
    onLoadingStateChanged = new OBC.Event<{
        "isLoading": boolean;
        "message": string;
    }>();

    private world: OBC.World | null = null;

    // Use OBC.FragmentsManager (tutorial approach)
    private fragments: OBC.FragmentsManager | null = null;

    private _model: FRAGS.FragmentsModel | null = null;

    private fitCamera: FitCamera | null = null;

    private cameraProjection: CameraProjection | null = null;

    private spatialStructure: SpatialStructure | null = null;

    private _sharing: boolean = false;

    set sharing(value: boolean) {
        this._sharing = value;
    }

    constructor(components: OBC.Components) {
        super(components);
        components.add(
            LoadModels.uuid,
            this,
        );
        this.world = components.get(CurrentWorld).world;
        // Initialize fragments manager from components (BimViewer already called init on it)
        this.fragments = components.get(OBC.FragmentsManager);
        this.fitCamera = components.get(FitCamera);
        this.cameraProjection = components.get(CameraProjection);
        this.spatialStructure = components.get(SpatialStructure);

    }

    private isModelLoaded(modelId: string): boolean {
        try {
            const list = this.fragments?.core.models.list as Map<string, FRAGS.FragmentsModel> | undefined;
            return !!list?.has(modelId);
        } catch {
            return false;
        }
    }

    // Load a single fragment file (kept for backwards compatibility)
    async load(url: string, modelId: string) {

        if (!(this.fragments && this.world)) {
            throw new Error("Missing required fragments or world.");
        }

        // Skip if already loaded to avoid duplicate component registration
        if (this.isModelLoaded(modelId)) {
            console.warn(`Model ${modelId} already loaded. Skipping.`);
            return;
        }

        try {
            this.onLoadingStateChanged.trigger({
                isLoading: true,
                message: "Loading BIM model from server..."
            });

            const file = await fetch(url);
            const buffer = await file.arrayBuffer();
            const model = await this.fragments.core.load(
                buffer,
                { modelId },
            );

            model.tiles.onItemSet.add(({ value: mesh }) => {
                if ("isMesh" in mesh) {
                    const mat = mesh.material as THREE.MeshStandardMaterial[];
                    if (mat[0].opacity === 1) {
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                    }
                }
            });

            for (const child of model.object.children) {
                child.castShadow = true;
                child.receiveShadow = true;
            }

            await this.setupModel(
                model,
                modelId,
            );

            this.onLoadingStateChanged.trigger({
                isLoading: false,
                message: ""
            });

        } catch (error) {
            this.onLoadingStateChanged.trigger({
                isLoading: false,
                message: ""
            });
            throw new Error(`Error loading model from URL: ${error}`);
        }
    }

    // New helper following tutorial pattern: load many concurrently
    async loadMany(urls: string[]) {
        if (!(this.fragments && this.world)) {
            throw new Error("Missing required fragments or world.");
        }
        if (!urls.length) return;
        this.onLoadingStateChanged.trigger({ isLoading: true, message: "Loading BIM models..." });
        try {
            const loaded = await Promise.all(
                urls.map(async (path) => {
                    const modelId = path.split("/").pop()?.split(".").shift();
                    if (!modelId) return null;
                    // Skip duplicates
                    if (this.isModelLoaded(modelId)) {
                        console.warn(`Model ${modelId} already loaded. Skipping.`);
                        return this.fragments!.core.models.list.get(modelId) as FRAGS.FragmentsModel | null;
                    }
                    const res = await fetch(path);
                    const buffer = await res.arrayBuffer();
                    // main fragments load
                    const model = await this.fragments!.core.load(buffer, { modelId });
                    await this.setupModel(model, modelId);
                    return model;
                })
            );
            this.onLoadingStateChanged.trigger({ isLoading: false, message: "" });
            return loaded.filter(m => m) as FRAGS.FragmentsModel[];
        } catch (e) {
            this.onLoadingStateChanged.trigger({ isLoading: false, message: "" });
            throw e;
        }
    }

    async loadFromFile(file: File, modelId: string) {

        if (!(this.fragments && this.world)) {
            throw new Error("Missing required components.");
        }

        // Skip if already loaded to avoid duplicate component registration
        if (this.isModelLoaded(modelId)) {
            console.warn(`Model ${modelId} already loaded. Skipping.`);
            return;
        }

        try {
            const fileBuffer = await file.arrayBuffer();

            if (file.name.toLowerCase().endsWith(".frag")) {
                // Handle fragment files - load directly
                this.onLoadingStateChanged.trigger({
                    isLoading: true,
                    message: "Loading BIM Model..."
                });

                const model = await this.fragments.core.load(
                    fileBuffer,
                    { modelId },
                );

                await this.setupModel(
                    model,
                    modelId,
                );

                // Loading complete
                this.onLoadingStateChanged.trigger({
                    isLoading: false,
                    message: ""
                });

            } else {
                throw new Error("LoadModels only supports .frag files. Use IfcToFragments for .ifc files.");
            }

        } catch (error) {
            // Make sure to clear loading state on error
            this.onLoadingStateChanged.trigger({
                isLoading: false,
                message: ""
            });
            throw new Error(`Error loading file: ${error}`);
        }
    }

    async loadModel(model: FRAGS.FragmentsModel, modelId: string) {
        try {
            // Skip if already attached
            if (this.isModelLoaded(modelId)) {
                console.warn(`Model ${modelId} already loaded. Skipping.`);
                return;
            }
            await this.setupModel(
                model,
                modelId,
            );
        } catch (error) {
            throw new Error(`Error setting up model: ${error}`);
        }
    }

    private async setupModel(model: FRAGS.FragmentsModel, modelId: string) {

        if (!this.world) {
            throw new Error("Missing required world.");
        }

        this._model = model;
        this.world.scene.three.add(model.object);

        model.object.position.set(
            0,
            0,
            0,
        );
        model.useCamera(this.world.camera.three);

        if (this.cameraProjection && this.world && this._model) {
            this.cameraProjection.onProjectionChanged.add(() => {
                if (this._model && this.world) {
                    this._model.useCamera(this.world.camera.three);
                }
            });
        }

        // Apply clipping plane to the model. Without this, we would have issues
        model.getClippingPlanesEvent = () => {
            return Array.from(this.world!.renderer!.three.clippingPlanes) || [];
        };

        if (!this._sharing && this.fitCamera) {
            await this.fitCamera.fitToBox(
                model.box,
                true,
            );
        }

        if (this.spatialStructure) {
            void this.spatialStructure.getSpatialStructure(modelId);
        }

        this.fragments?.core.update(true);
    }

}
