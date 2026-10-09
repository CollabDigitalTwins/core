// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from "@thatopen/components";

import { CameraProjection } from "./CameraProjection";
import { CurrentWorld } from "./CurrentWorld";
import { FitCamera } from "./FitCamera";
import { applyModelPlacement } from "./lib/applyModelPlacement";
import { SpatialStructure } from "./SpatialStructure";

import type { ModelPlacementColumns } from "./lib/applyModelPlacement";
import type * as FRAGS from "@thatopen/fragments";
import type * as THREE from "three";

export class LoadModels extends OBC.Component {

    static readonly uuid = "4927c1cc-af40-4ef9-8010-c0a1111987b1" as const;

    enabled = false;

    onLoadingStateChanged = new OBC.Event<{
        "isLoading": boolean;
        "message": string;
    }>();

    private world: OBC.World | null = null;

    private fragments: OBC.FragmentsManager | null = null;

    private _model: FRAGS.FragmentsModel | null = null;

    private fitCamera: FitCamera | null = null;

    private cameraProjection: CameraProjection | null = null;

    private spatialStructure: SpatialStructure | null = null;

    private _sharing: boolean = false;

    private queues = new Map<string, Promise<unknown>>();

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
        this.fragments = components.get(OBC.FragmentsManager);
        this.fitCamera = components.get(FitCamera);
        this.cameraProjection = components.get(CameraProjection);
        this.spatialStructure = components.get(SpatialStructure);

    }

    // `disposeModel` is async, so a load racing it would see the old model and skip its own work.
    private enqueue<T>(modelId: string, task: () => Promise<T>): Promise<T> {
        const previous = this.queues.get(modelId) ?? Promise.resolve();
        const next = previous.then(task, task);
        const settled = next.catch(() => undefined);
        this.queues.set(modelId, settled);
        void settled.then(() => {
            if (this.queues.get(modelId) === settled) this.queues.delete(modelId);
        });
        return next;
    }

    private modelFromList(modelId: string): FRAGS.FragmentsModel | null {
        try {
            const list = this.fragments?.core.models.list as Map<string, FRAGS.FragmentsModel> | undefined;
            return list?.get(modelId) ?? null;
        } catch {
            return null;
        }
    }

    /** Takes a model out of the scene, freeing it and everything derived from it. */
    async unload(modelId: string): Promise<void> {
        await this.enqueue(modelId, async () => {
            if (!this.isModelLoaded(modelId)) return;
            await this.fragments?.core.disposeModel(modelId);
        });
    }

    private isModelLoaded(modelId: string): boolean {
        try {
            const list = this.fragments?.core.models.list as Map<string, FRAGS.FragmentsModel> | undefined;
            return !!list?.has(modelId);
        } catch {
            return false;
        }
    }

    /** `placement` is applied as the model is added, before the camera fit, so no reader of the new model sees it at the origin. */
    async load(url: string, modelId: string, placement?: ModelPlacementColumns): Promise<FRAGS.FragmentsModel | null> {
        return this.enqueue(modelId, () => this.loadNow(url, modelId, placement));
    }

    private async loadNow(url: string, modelId: string, placement?: ModelPlacementColumns): Promise<FRAGS.FragmentsModel | null> {

        if (!(this.fragments && this.world)) {
            throw new Error("Missing required fragments or world.");
        }

        if (this.isModelLoaded(modelId)) {
            console.warn(`Model ${modelId} already loaded. Skipping.`);
            return this.modelFromList(modelId);
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
                placement,
            );

            this.onLoadingStateChanged.trigger({
                isLoading: false,
                message: ""
            });

            return model;

        } catch (error) {
            this.onLoadingStateChanged.trigger({
                isLoading: false,
                message: ""
            });
            throw new Error(`Error loading model from URL: ${error}`);
        }
    }

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
                    if (this.isModelLoaded(modelId)) {
                        console.warn(`Model ${modelId} already loaded. Skipping.`);
                        return this.fragments!.core.models.list.get(modelId) as FRAGS.FragmentsModel | null;
                    }
                    const res = await fetch(path);
                    const buffer = await res.arrayBuffer();
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

        if (this.isModelLoaded(modelId)) {
            console.warn(`Model ${modelId} already loaded. Skipping.`);
            return;
        }

        try {
            const fileBuffer = await file.arrayBuffer();

            if (file.name.toLowerCase().endsWith(".frag")) {
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

                this.onLoadingStateChanged.trigger({
                    isLoading: false,
                    message: ""
                });

            } else {
                throw new Error("LoadModels only supports .frag files. Use IfcToFragments for .ifc files.");
            }

        } catch (error) {
            this.onLoadingStateChanged.trigger({
                isLoading: false,
                message: ""
            });
            throw new Error(`Error loading file: ${error}`);
        }
    }

    async loadModel(model: FRAGS.FragmentsModel, modelId: string) {
        try {
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

    private async setupModel(model: FRAGS.FragmentsModel, modelId: string, placement?: ModelPlacementColumns) {

        if (!this.world) {
            throw new Error("Missing required world.");
        }

        this._model = model;
        this.world.scene.three.add(model.object);

        if (placement) applyModelPlacement(model.object, placement);
        else model.object.position.set(0, 0, 0);
        model.useCamera(this.world.camera.three);

        if (this.cameraProjection && this.world && this._model) {
            this.cameraProjection.onProjectionChanged.add(() => {
                // Never removed, so it can outlive the world; `renderer` goes null on dispose where `camera` throws.
                if (this._model && this.world?.renderer) {
                    this._model.useCamera(this.world.camera.three);
                }
            });
        }

        // The fragments model outlives the world and the culler polls this during teardown, so no renderer means no planes.
        model.getClippingPlanesEvent = () => {
            const planes = this.world?.renderer?.three.clippingPlanes;
            return planes ? Array.from(planes) : [];
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

        void this.fragments?.core.update(true);
    }

}
