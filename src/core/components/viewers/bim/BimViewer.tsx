"use client";

import * as React from "react";
import * as OBC from "@thatopen/components";
import * as OBF from "@thatopen/components-front"
import * as THREE from "three";
import { useTranslations, useLocale } from 'next-intl';
import { ToolsContext, BimContext, MenusContext } from "../../../store";

import { CurrentWorld } from "./src/CurrentWorld";
import { CurrentCamera } from './src/CurrentCamera';
import { Highlighter } from "./src/Highlighter";
import { FloorplanTool } from "./src/FloorplanTool";
import { ElevationsTool } from "./src/ElevationsTool";
import { ViewModeCoordinator } from "./src/lib/ViewModeCoordinator";

import { PropertiesMenu } from "./src/propertiesMenu";
import { BimLoadingState } from "./src/BimLoadingState";
import { ViewportGizmo } from "./src/ViewportGizmo";
import { useBimCoordinateSystem } from "../useCoordinateSystem";

export function BimViewer() {

    const t = useTranslations('ViewportGizmo');
    const locale = useLocale();

    const { dispatch: bimDispatch, state: bimState } = React.useContext(BimContext);
    const { bimComponents } = bimState.bim;

    const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext);
    const { currentToolId } = toolsState.tools;

    const { state: menusState } = React.useContext(MenusContext);
    const { currentViewer } = menusState.menus;
    

    const containerRef = React.useRef<HTMLDivElement>(null);
    const workerUrlRef = React.useRef<string | null>(null);
    const resizeObserverRef = React.useRef<ResizeObserver | null>(null);

    const createViewer = React.useCallback(
        async () => {
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

            if (grid) {
                bimDispatch({
                    "type": "SET_GRID",
                    "payload": { grid }
                });
            }

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
            components.get(Highlighter);
            components.get(ViewModeCoordinator);
            components.get(FloorplanTool);
            components.get(ElevationsTool);

            // Grid injection is safe here — fragments.core is initialized.
            if (grid) {
                components.get(FloorplanTool).setGrid(grid);
                components.get(ElevationsTool).setGrid(grid);
            }

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

            // Ensure canvas takes full container size
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                canvas.style.display = 'block';
            }

            // Handle resize using container dimensions
            const handleResize = () => {
                const width = container.clientWidth;
                const height = container.clientHeight;
                if (width && height) {
                    world.renderer?.resize(new THREE.Vector2(width, height));
                }
            };
            
            // Initial resize
            handleResize();
            
            // Watch for container size changes using ResizeObserver. This
            // already covers the window-resize case: when the window resizes,
            // the flex layout reshapes this container, and ResizeObserver
            // fires.
            const resizeObserver = new ResizeObserver(() => {
                handleResize();
            });
            resizeObserver.observe(container);
            resizeObserverRef.current = resizeObserver;

            // Audit Phase 1.E (F-18 / F-B6): the previous
            // `window.addEventListener('resize', handleResize)` here had no
            // matching removeEventListener — every BimViewer mount leaked a
            // listener (Phase 0 baseline measured ~+9 listeners/min during
            // active use). Removed entirely; the ResizeObserver above is
            // sufficient for the redraw case.
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

    // Enforce Y-up coordinate system for Three.js / camera-controls.
    // Runs whenever the world (and its controls) becomes available, and resets on unmount.
    useBimCoordinateSystem(bimState.bim.world?.camera?.controls ?? null);

    // Control ViewportGizmo based on current viewer
    React.useEffect(() => {
        if (!bimComponents) return;

        const viewportGizmo = bimComponents.get(ViewportGizmo);

        viewportGizmo.setLabels({
            top: t('top'),
            right: t('right'),
            bottom: t('bottom'),
            left: t('left'),
            front: t('front'),
            back: t('back')
        });

        if (!viewportGizmo) return;

        if (currentViewer === 'bim') {
            viewportGizmo.enabled = true;
            viewportGizmo.add();
        } else {
            viewportGizmo.enabled = false;
            viewportGizmo.remove();
        }
    }, [bimComponents, currentViewer, locale, t]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden"
            }}
        >
            <BimLoadingState />
            <div
                className="bim-container"
                id="bim-viewer-container"
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    background: "radial-gradient(circle, rgba(255, 255, 255, 1) 50%, rgba(220, 220, 220, 1) 100%)",
                }}
            />
            <PropertiesMenu />
        </div>
    );
}