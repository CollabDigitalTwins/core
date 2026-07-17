"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front"
import * as THREE from "three";
import { BimContext } from "../../../../store";
import { LoadingSpinner } from '../../../ui/LoadingSpinner';

import { CurrentWorld } from "../src/CurrentWorld";
import { CurrentCamera } from '../src/CurrentCamera';
import { FitCamera } from './FitCamera';
import { CameraProjection } from './CameraProjection';
import { SpatialStructure } from './SpatialStructure';
import { LoadModels } from './LoadModels';
import { IfcToFragments } from './IfcToFragments';
import { DbFile } from '../../../../types/dbTypes';
import { ModelManager } from './ModelManager';
import { FloorplanTool } from './FloorplanTool';
import { ElevationsTool } from './ElevationsTool';
import { ViewModeCoordinator } from './lib/ViewModeCoordinator';

interface Props {
    file: DbFile
    width?: string
    height?: string
}

export function SimpleBimViewer({file, width = "100%", height = "100%"}: Props) {

    const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext);
    const { bimComponents } = bimState.bim;

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const workerUrlRef = React.useRef<string | null>(null); // To store the worker URL for cleanup
    const resizeObserverRef = React.useRef<ResizeObserver | null>(null); // To store the ResizeObserver for cleanup
    const [isLoading, setIsLoading] = React.useState(false);
    const [loadingMessage, setLoadingMessage] = React.useState('');

    const createViewer = React.useCallback(
        async () => {

            THREE.Object3D.DEFAULT_UP.set(0, 1, 0); // Y-up

            if (!containerRef.current || bimComponents) return;

            const container = containerRef.current;
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

            world.scene.setup();
            world.scene.three.background = null;

            const grids = components.get(OBC.Grids);
            const grid = grids.create(world);
            const axesHelper = new THREE.AxesHelper(5);
            world.scene.three.add(axesHelper);

            const fragments = components.get(OBC.FragmentsManager);

            const githubUrl =
                "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
            const fetchedUrl = await fetch(githubUrl);
            const workerBlob = await fetchedUrl.blob();
            const workerFile = new File([workerBlob], "worker.mjs", {
                type: "text/javascript",
            });
            const workerUrl = URL.createObjectURL(workerFile);
            workerUrlRef.current = workerUrl; // Store reference for cleanup
            fragments.init(workerUrl);

            world.camera.controls.addEventListener("control", () =>
                fragments.core.update(),
            );

            world.camera.controls.restThreshold = 0.005;
            world.camera.controls.addEventListener("rest", () =>
                fragments.core.update(true)
            );

            components.get(CurrentWorld).world = world;
            components.get(CurrentCamera).camera = world.camera;

            // Enable shadows
            world.renderer.three.shadowMap.enabled = true;
            world.renderer.three.shadowMap.type = THREE.PCFSoftShadowMap;
            world.scene.setup({
                shadows: {
                    cascade: 1,
                    resolution: 1024,
                },
            });

            world.scene.distanceRenderer.excludedObjects.add(grid.three);

            await world.scene.updateShadows();

            world.camera.controls.addEventListener("rest", async () => {
                await world.scene.updateShadows();
            });

            world.scene.three.background = null;

            bimDispatch({
                type: "SET_COMPONENTS",
                payload: { bimComponents: components, world, fragments }
            });

            // Use requestAnimationFrame to ensure resize happens after render
            requestAnimationFrame(() => {
                const containerWidth = container.clientWidth || 1303;
                const containerHeight = container.clientHeight || 500;
                world.renderer.resize(new THREE.Vector2(containerWidth, containerHeight));
            });

            // Get components (this will instantiate them if needed)
            components.get(FitCamera);
            components.get(CameraProjection);
            components.get(SpatialStructure);
            components.get(LoadModels);
            components.get(ViewModeCoordinator);
            components.get(FloorplanTool);
            components.get(ElevationsTool);

            // Grid injection is safe here — fragments.core is initialized.
            if (grid) {
                components.get(FloorplanTool).setGrid(grid);
                components.get(ElevationsTool).setGrid(grid);
            }
            const ifcToFragments = components.get(IfcToFragments);
            const loadModels = components.get(LoadModels);
            const modelManager = components.get(ModelManager);

            // Handle resize using container dimensions
            const handleResize = () => {
                const width = container.clientWidth || 1303;
                const height = container.clientHeight || 500;
                world.renderer?.resize(new THREE.Vector2(width, height));
            };

            // Watch for container size changes using ResizeObserver. This
            // already covers the window-resize case: when the window resizes,
            // the flex layout reshapes this container, and ResizeObserver
            // fires.
            const resizeObserver = new ResizeObserver(() => {
                handleResize();
            });
            resizeObserver.observe(container);
            resizeObserverRef.current = resizeObserver;

            // Listen to loading state changes from both components
            ifcToFragments.onLoadingStateChanged.add(({ isLoading, message }) => {
                setIsLoading(isLoading);
                setLoadingMessage(message);
            });

            loadModels.onLoadingStateChanged.add(({ isLoading, message }) => {
                setIsLoading(isLoading);
                setLoadingMessage(message);
            });

            // Load the model based on file extension
            try {
                const ext = file.extension.toLowerCase();

                if (ext === 'frag') {
                    await loadModels.load(file.url, String(file.id));
                } else if (ext === 'ifc') {
                    const fetchedFile = await fetch(file.url);
                    const ifcFile = new File([await fetchedFile.arrayBuffer()], file.name, { type: "application/octet-stream" });
                    const fragmentBytes = await ifcToFragments.loadFromFile(ifcFile);

                    const fragmentBuffer = fragmentBytes.buffer as ArrayBuffer;
                    const model = await fragments.core.load(fragmentBuffer, { modelId: String(file.id) });

                    world.scene.three.add(model.object);
                    model.useCamera(world.camera.three);

                    setIsLoading(false);
                    setLoadingMessage('');
                } else if (['gltf', 'glb', 'fbx', 'obj', 'dae', 'collada'].includes(ext)) {
                    setIsLoading(true);
                    setLoadingMessage('Loading 3D Model...');

                    const urlWithExtension = file.url.includes('.') ? file.url : `${file.url}?ext=${ext}`;

                    const fetchedFile = await fetch(file.url);
                    const blob = await fetchedFile.blob();
                    const modelFile = new File([blob], `${file.name}.${ext}`, { type: blob.type });

                    const modelInfo = await modelManager.load(
                        modelFile,
                        String(file.id),
                        file.name,
                        {
                            enableAnimations: true,
                            enableGizmo: false
                        }
                    );

                    if (modelInfo) {
                        const box = new THREE.Box3().setFromObject(modelInfo.model);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());

                        const maxDim = Math.max(size.x, size.y, size.z);
                        const fov = world.camera.three.fov * (Math.PI / 180);
                        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

                        cameraZ *= 1.5;

                        const camX = center.x;
                        const camY = center.y;
                        const camZ = center.z + cameraZ;

                        world.camera.controls.setLookAt(
                            camX, camY, camZ,
                            center.x, center.y, center.z,
                            true
                        );
                    }

                    setIsLoading(false);
                    setLoadingMessage('');
                }

                fragments.core.update(true);

                setTimeout(() => {
                    const width = container.clientWidth || 1303;
                    const height = container.clientHeight || 500;
                    world.renderer.resize(new THREE.Vector2(width, height));

                    window.dispatchEvent(new Event('resize'));
                }, 100);
            } catch (error) {
                console.error('Error loading BIM file:', error);
                setIsLoading(false);
            }

        }, []
    );

    React.useEffect(() => {
        createViewer();

        // Cleanup function to properly dispose of components when unmounting
        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
            if (bimComponents) {
                bimComponents.dispose();
            }
            bimDispatch({
                type: "DISPOSE-BIM"
            });
        };
    }, []);

    return (
        <div
            style={{
                position: "relative",
                width,
                height,
                minHeight: height,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
            }}
        >
            {isLoading && (
                <div className="absolute z-10 inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                    <div className="self-stretch text-center text-foreground text-xl font-semibold font-['Inter'] leading-7 flex items-center justify-center gap-2">
                        {loadingMessage || "Loading BIM Model"}
                        <LoadingSpinner size={20} />
                    </div>
                </div>
            )}
            <div
                className="bim-container"
                id="bim-viewer-container"
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    flex: 1,
                    position: "relative",
                    background: "radial-gradient(circle, rgba(255, 255, 255, 1) 50%, rgba(220, 220, 220, 1) 100%)",
                }}
            />
        </div>
    );
}