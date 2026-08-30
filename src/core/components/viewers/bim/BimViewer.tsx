"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations, useLocale } from 'next-intl';
import * as React from "react";
import * as THREE from "three";

import { useUndoRedoShortcuts } from "../../../hooks/useUndoRedoShortcuts";
import { ToolsContext, BimContext, MenusContext } from "../../../store";
import { ViewerNames } from "../../../types/dbTypes";
import { SensorLegend } from "../../ui/Sensors/SensorLegend";
import { ViewerLegendHost } from "../shared/legends/ViewerLegendHost";
import { useBimCoordinateSystem } from "../useCoordinateSystem";

import { BimLoadingState } from "./src/BimLoadingState";
import { BuildingLocationSync } from "./src/BuildingLocationSync";
import { ElementAppearance } from "./src/ElementAppearance";
import { ElevationsTool } from "./src/ElevationsTool";
import { FloorplanTool } from "./src/FloorplanTool";
import { Highlighter } from "./src/Highlighter";
import { IfcClasses } from "./src/IfcClasses";
import { createBimWorld } from "./src/lib/createBimWorld";
import { ViewModeCoordinator } from "./src/lib/ViewModeCoordinator";
import { ModelsSync } from "./src/ModelsSync";
import { BimPointClouds } from "./src/PointClouds";
import { BimPointCloudSync } from "./src/PointClouds/BimPointCloudSync";
import { PointCloudAlignment } from "./src/PointClouds/PointCloudAlignment";
import { PropertiesMenu } from "./src/propertiesMenu";
import { SelectionSync } from "./src/SelectionSync";
import { ClippingPlanes } from "./src/tools/ClippingTool/ClippingPlanes";
import { ViewportGizmo } from "./src/ViewportGizmo";

import type * as OBC from "@thatopen/components";


export function BimViewer({ pointcloudApiUrl }: { pointcloudApiUrl?: string }) {

    const t = useTranslations('ViewportGizmo');
    const locale = useLocale();

    const { dispatch: bimDispatch, state: bimState } = React.useContext(BimContext);
    const { bimComponents } = bimState.bim;

    const { dispatch: toolsDispatch, state: toolsState } = React.useContext(ToolsContext);
    const { currentToolId } = toolsState.tools;

    const { state: menusState } = React.useContext(MenusContext);
    const { currentViewer } = menusState.menus;

    // Appearance and clipping keep separate undo stacks; the most recently changed one wins.
    const lastTouchedHistory = React.useRef<'appearance' | 'clipping'>('appearance');

    React.useEffect(() => {
        if (!bimComponents) return;
        const appearance = bimComponents.get(ElementAppearance);
        const clipping = bimComponents.get(ClippingPlanes);
        const offAppearance = appearance.history.onChanged(() => {
            lastTouchedHistory.current = 'appearance';
        });
        const offClipping = clipping.history.onChanged(() => {
            lastTouchedHistory.current = 'clipping';
        });
        return () => {
            offAppearance();
            offClipping();
        };
    }, [bimComponents]);

    const undoRedoTarget = React.useCallback((direction: 'undo' | 'redo') => {
        if (!bimComponents) return null;
        const appearance = bimComponents.get(ElementAppearance);
        const clipping = bimComponents.get(ClippingPlanes);
        const canRun = (target: typeof appearance | typeof clipping) =>
            direction === 'undo' ? target.history.canUndo : target.history.canRedo;

        const preferred = lastTouchedHistory.current === 'clipping' ? clipping : appearance;
        if (canRun(preferred)) return preferred;

        const other = preferred === clipping ? appearance : clipping;
        return canRun(other) ? other : null;
    }, [bimComponents]);

    useUndoRedoShortcuts({
        undo: () => { void undoRedoTarget('undo')?.undo(); },
        redo: () => { void undoRedoTarget('redo')?.redo(); },
    });


    const containerRef = React.useRef<HTMLDivElement>(null);
    const workerUrlRef = React.useRef<string | null>(null);
    const resizeObserverRef = React.useRef<ResizeObserver | null>(null);
    // This mount's own instance, so cleanup and the create-guard cannot read a stale [] closure.
    const componentsRef = React.useRef<OBC.Components | null>(null);

    const createViewer = React.useCallback(
        async (isCancelled: () => boolean) => {
            // Keyed to the ref, not the [] closure: a second init builds a second detached canvas.
            if (!containerRef.current || componentsRef.current) return;

            const container = containerRef.current;
            const { components, world, fragments, grid, workerUrl } = await createBimWorld(container);
            workerUrlRef.current = workerUrl;

            if (grid) {
                bimDispatch({
                    "type": "SET_GRID",
                    "payload": { grid }
                });
            }

            components.get(Highlighter);
            // Up front so it subscribes to model loads before any model arrives.
            components.get(IfcClasses);
            components.get(ViewModeCoordinator);
            // Same reason, plus drawing modes releasing the viewer both need its overrides repainted.
            components.get(ElementAppearance);
            components.get(FloorplanTool);
            components.get(ElevationsTool);
            components.get(BimPointClouds);
            components.get(PointCloudAlignment);

            // Grid injection is safe here — fragments.core is initialized.
            if (grid) {
                components.get(FloorplanTool).setGrid(grid);
                components.get(ElevationsTool).setGrid(grid);
            }

            // Superseded or unmounted while awaiting: drop it rather than let it win the store.
            if (isCancelled()) {
                components.dispose();
                return;
            }
            componentsRef.current = components;
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

            // Covers window resize too: the flex layout reshapes this container, which fires it.
            const resizeObserver = new ResizeObserver(() => {
                handleResize();
            });
            resizeObserver.observe(container);
            resizeObserverRef.current = resizeObserver;

        }, []
    );

    React.useEffect(() => {
        let cancelled = false;
        void createViewer(() => cancelled);

        // Cancels an in-flight createViewer and disposes the instance this mount created.
        return () => {
            cancelled = true;
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
            // OBC's disposal loop is unguarded, so one throw skips every component after it.
            try {
                componentsRef.current?.dispose();
            } catch (error) {
                console.error("BIM teardown did not complete cleanly", error);
            } finally {
                componentsRef.current = null;
                bimDispatch({
                    type: "DISPOSE-BIM"
                });
            }
        };
    }, []);

    // Enforces Y-up for three / camera-controls whenever the world's controls appear.
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
            <ModelsSync />
            <BuildingLocationSync />
            <BimPointCloudSync pointcloudApiUrl={pointcloudApiUrl} />
            <SelectionSync />
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
            {/* Bottom-left stack, mirroring MapViewer: cards stack upward with flex so a new
                overlay never needs a hand-tuned bottom offset. */}
            <div className="absolute bottom-20 md:bottom-3 left-3 z-10 flex max-w-[calc(100vw-1.5rem)] flex-col gap-2 pointer-events-none">
                <SensorLegend />
                <ViewerLegendHost viewer={ViewerNames.bim} />
            </div>
            <PropertiesMenu />
        </div>
    );
}