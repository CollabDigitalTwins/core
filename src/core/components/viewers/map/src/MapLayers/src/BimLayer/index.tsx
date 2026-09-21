"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from "@thatopen/components";
import * as LR from "lucide-react";
import { type CustomLayerInterface, type LngLatLike } from "maplibre-gl";
import * as React from "react";
import { Marker } from "react-map-gl/maplibre";
import * as THREE from "three";

import { BimContext, BuildingsContext, MapContext } from "../../../../../../../store";
import { markerOcclusionProps } from "../../../../../../../utils/markerUtils";
import { writeModelMatrix } from "../../../../utils/modelMatrix";
import { toggleBimToMap } from "../../../../utils/toggleBimToMap";
import { extractPositionAndRotation } from "../../../Placement/mapPlacementGeo";
import { MapPlacementHost } from "../../../Placement/MapPlacementHost";
import { MapPlacementMenu } from "../../../Placement/MapPlacementMenu";
import { useMapContextMenu } from "../../../Placement/useMapContextMenu";
import { disposeThreeScene } from "../disposeThreeScene";
import { PlaceOnMap } from "../PlaceOnMap";

import type { Building, DbFile } from "../../../../../../../types/dbTypes";
import type { FileAction } from "../../../../../../../types/global";
import type { FileMarkerAction } from "../../../../../../ui/FilesManager/src/PlacementActionsCard";
import type { PlacementMode } from "../../../../../shared/placement/placementTarget";
import type * as FRAGS from "@thatopen/fragments";
import type { Map } from "maplibre-gl";


const bimLayerId = (fileId: number | string) => `bim-model-${fileId}`;

export const BimLayer = () => {

    const { state: mapState } = React.useContext(MapContext);
    const { map } = mapState.map;

    const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext);
    const { state: buildingsState } = React.useContext(BuildingsContext);
    const { buildings } = buildingsState.buildings;
    const { bimModelsAddedToMap, editingBimModelId } = bimState.bim;

    const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);

    const addedLayersRef = React.useRef<Set<string>>(new Set());
    const prevModelsRef = React.useRef<Set<string>>(new Set());

    const sharedRef = React.useRef<{
        components: OBC.Components;
        fragments: OBC.FragmentsManager;
    } | null>(null);

    const [loadingBuildings, setLoadingBuildings] = React.useState<Set<number>>(new Set());
    const { menu: contextMenu, open: openContextMenu, close: closeContextMenu } =
        useMapContextMenu<{ bimFile: DbFile }>(map);

    const handleContextMenuAction = React.useCallback((action: FileAction, file: DbFile) => {
        if (action === 'view') {
            bimDispatch({ type: 'REMOVE_BIM_FROM_MAP', payload: { bimModelId: String(file.id) } });
        } else if (action === 'move') {
            bimDispatch({ type: 'EDIT_BIM_MODEL_BY_ID', payload: { editingBimModelId: String(file.id) } });
        }
    }, [bimDispatch]);

    const [editMode, setEditMode] = React.useState<PlacementMode>('translate');

    const handlePlacementMenuAction = React.useCallback((action: FileMarkerAction) => {
        const file = contextMenu?.item.bimFile;
        closeContextMenu();
        if (!file) return;

        if (action === 'move' || action === 'rotate' || action === 'scale') {
            setEditMode(action === 'move' ? 'translate' : action);
            bimDispatch({ type: 'EDIT_BIM_MODEL_BY_ID', payload: { editingBimModelId: String(file.id) } });
            return;
        }

        handleContextMenuAction(action as FileAction, file);
    }, [contextMenu, closeContextMenu, bimDispatch, handleContextMenuAction]);

    const tempPositionsRef = React.useRef<Record<string, { lat: number; lng: number }>>({});
    const tempRotationsRef = React.useRef<Record<string, number>>({});
    const tempElevationsRef = React.useRef<Record<string, number>>({});

    const editingBimModelRef = React.useRef<string | null>(editingBimModelId);
    React.useEffect(() => {
        editingBimModelRef.current = editingBimModelId;
    }, [editingBimModelId]);

    // A model with nowhere to draw asks for a point before it can be a layer at all.
    const unplacedModel = React.useMemo(
        () => bimModelsAddedToMap.find(model => {
            const { lng, lat } = extractPositionAndRotation(model.bimFile, model.building ?? undefined);
            return lng === null || lat === null;
        }) ?? null,
        [bimModelsAddedToMap],
    );

    const handleExitEditMode = React.useCallback(() => {
        bimDispatch({ type: "EDIT_BIM_MODEL_BY_ID", payload: { editingBimModelId: null } });
    }, [bimDispatch]);

    const handleMapRepaint = React.useCallback(() => {
        if (map) map.triggerRepaint();
    }, [map]);
    const getOrCreateShared = React.useCallback(async () => {
        if (sharedRef.current) return sharedRef.current;

        const components = new OBC.Components();
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
        world.scene = new OBC.SimpleScene(components);
        world.renderer = new OBC.SimpleRenderer(components, document.createElement("div"));
        world.camera = new OBC.SimpleCamera(components);
        components.init();
        world.scene.setup();

        const fragments = components.get(OBC.FragmentsManager);
        const fetchedUrl = await fetch("https://thatopen.github.io/engine_fragment/resources/worker.mjs");
        const workerBlob = await fetchedUrl.blob();
        const workerUrl = URL.createObjectURL(
            new File([workerBlob], "worker.mjs", { type: "text/javascript" })
        );
        fragments.init(workerUrl);

        sharedRef.current = { components, fragments };
        return sharedRef.current;
    }, []);

    React.useEffect(() => {
        if (!map) return;

        const currentModelIds = new Set(bimModelsAddedToMap.map(bm => String(bm.bimFile.id)));

        const modelsToRemove = Array.from(prevModelsRef.current).filter(
            id => !currentModelIds.has(id)
        );
        const modelsToAdd = bimModelsAddedToMap.filter(
            bm => !prevModelsRef.current.has(String(bm.bimFile.id))
        );

        modelsToRemove.forEach(id => {
            const layerId = bimLayerId(id);
            if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
                addedLayersRef.current.delete(layerId);
            }
        });

        prevModelsRef.current = currentModelIds;

        if (modelsToAdd.length === 0) return;

        // ─── Load a single BIM model ──────────────────────────────────────────
        const loadModel = async (
            buildingModel: { bimFile: DbFile; building?: Building | null },
            fragments: OBC.FragmentsManager,
            scene: THREE.Scene,
            map: Map,
            lodCamera: THREE.PerspectiveCamera
        ): Promise<FRAGS.FragmentsModel | null> => {

            const { bimFile, building } = buildingModel;
            if (!bimFile) return null;

            const buildingId = building?.id ?? bimFile.id;
            setLoadingBuildings(prev => new Set(prev).add(buildingId));

            try {
                const file = await fetch(bimFile.url);
                if (!file.ok) throw new Error(`Fetch failed: ${file.status} ${file.statusText}`);

                const buffer = await file.arrayBuffer();
                const model = await fragments.core.load(buffer, { modelId: String(bimFile.id) });

                if (!model.box.isEmpty()) {
                    const center = model.box.getCenter(new THREE.Vector3());
                    const size   = model.box.getSize(new THREE.Vector3());
                    model.object.position.set(-center.x, 0, -center.z);

                    // lodCamera: above the model's new IFC-space centre (XZ is now 0,0)
                    lodCamera.position.set(0, center.y + Math.max(size.x, size.y, size.z) * 2, 0);
                    lodCamera.lookAt(0, center.y, 0);
                } else {
                    lodCamera.position.set(0, 100, 0);
                    lodCamera.lookAt(0, 0, 0);
                }
                lodCamera.updateMatrixWorld();
                model.useCamera(lodCamera);

                model.graphicsQuality = 1;
                scene.add(model.object);
                void fragments.core.update(true);
                map.triggerRepaint();

                return model;

            } catch (error) {
                console.error("Error loading BIM model:", error);
                return null;
            } finally {
                setLoadingBuildings(prev => {
                    const next = new Set(prev);
                    next.delete(buildingId);
                    return next;
                });
            }
        };

        // ─── Build a MapLibre custom layer for one model ──────────────────────
        const createCustomLayer = (
            buildingModel: { bimFile: DbFile; building?: Building | null },
            fragments: OBC.FragmentsManager,
            scene: THREE.Scene
        ): CustomLayerInterface | undefined => {

            const { bimFile, building } = buildingModel;
            const bimFileKey = String(bimFile.id);
            const {
                lng: baseLng, lat: baseLat,
                rotation: originalRotation,
            } = extractPositionAndRotation(bimFile, building);
            if (baseLng === null || baseLat === null) return undefined;

            // Per-layer state kept in closure
            let model: FRAGS.FragmentsModel | null = null;
            let lastAppliedRotation = originalRotation;
            let lastLodUpdate = 0;
            // Render-on-demand: cache terrain elevation off the per-frame path and
            // only keep repainting while the camera recently moved, so an idle map
            // with a placed model stops re-rendering instead of pinning the main
            // thread (this was the freeze after a geocoder flyTo to high zoom).
            let cachedTerrainElev = 0;
            let lastMoveTime = performance.now();
            const SETTLE_MS = 1000;
            const recomputeTerrainElev = () => {
                const { lng, lat } = extractPositionAndRotation(bimFile, building);
                if (lng !== null && lat !== null) {
                    const e = map.queryTerrainElevation([lng, lat]);
                    if (e !== null && e !== undefined) cachedTerrainElev = e;
                }
            };

            let onMapMove: () => void;
            let onMapMoveEnd: () => void;
            const renderCamera = new THREE.PerspectiveCamera();
            const lodCamera    = new THREE.PerspectiveCamera();
            // Reused per-frame matrices/vectors — render() must not allocate.
            const _vp = new THREE.Matrix4();
            const _m = new THREE.Matrix4();
            const _p = new THREE.Matrix4();
            const _vm = new THREE.Matrix4();
            const _camPos = new THREE.Vector3();
            const _center = new THREE.Vector3();
            const _lookTarget = new THREE.Vector3();
            const _scaleVec = new THREE.Vector3(1, 1, 1);

            return {
                id: bimLayerId(bimFile.id),
                type: "custom",
                renderingMode: "3d",

                onAdd(map, gl) {
                    scene.rotateY(originalRotation * (Math.PI / 180));
                    this.scene = scene;

                    void loadModel(buildingModel, fragments, scene, map, lodCamera).then(loaded => {
                        model = loaded;
                        // Open the settle window so the just-loaded fragments stream
                        // in and paint over the next frames, then idle.
                        lastMoveTime = performance.now();
                        recomputeTerrainElev();
                        map.triggerRepaint();
                    });

                    if (!rendererRef.current) {
                        rendererRef.current = new THREE.WebGLRenderer({
                            canvas: map.getCanvas(),
                            context: gl,
                            alpha: true,
                        });
                        rendererRef.current.autoClear = false;
                    }
                    this.renderer = rendererRef.current;
                    // Track movement so render() knows when it may stop repainting.
                    onMapMove = () => { lastMoveTime = performance.now(); };
                    onMapMoveEnd = () => {
                        lastMoveTime = performance.now();
                        if (model) void fragments.core.update(true);
                        // Terrain tiles for the new view are loaded once the camera
                        // settles — refresh the cached elevation here, not per frame.
                        recomputeTerrainElev();
                        map.triggerRepaint();
                    };
                    map.on("move",    onMapMove);
                    map.on("moveend", onMapMoveEnd);
                },

                render(_, args) {
                    if (
                        editingBimModelRef.current === bimFileKey &&
                        tempRotationsRef.current[bimFileKey] !== undefined
                    ) {
                        const cur = tempRotationsRef.current[bimFileKey];
                        if (cur !== lastAppliedRotation) {
                            scene.rotateY((cur - lastAppliedRotation) * (Math.PI / 180));
                            lastAppliedRotation = cur;
                            map.triggerRepaint();
                        }
                    } else {
                        const { rotation: baseRot } = extractPositionAndRotation(bimFile, building);
                        if (baseRot !== lastAppliedRotation) {
                            scene.rotateY((baseRot - lastAppliedRotation) * (Math.PI / 180));
                            lastAppliedRotation = baseRot;
                            map.triggerRepaint();
                        }
                    }

                    const {
                        lng: baseLngNow, lat: baseLatNow,
                        elevation: baseElevNow,
                    } = extractPositionAndRotation(bimFile, building);

                    let modelLongitude = baseLngNow;
                    let modelLatitude  = baseLatNow;
                    let modelElevation = baseElevNow;

                    if (editingBimModelRef.current === bimFileKey) {
                        const tp = tempPositionsRef.current[bimFileKey];
                        if (tp) { modelLongitude = tp.lng; modelLatitude = tp.lat; }
                        const te = tempElevationsRef.current[bimFileKey];
                        if (te !== undefined) modelElevation = te;
                    }

                    const modelOrigin   = [modelLongitude, modelLatitude] as LngLatLike;
                    // Use the cached terrain elevation (refreshed on moveend); query
                    // live only while actively editing this model's position. Keeps
                    // the expensive queryTerrainElevation off the hot path — the
                    // per-frame query was a main driver of the high-zoom freeze.
                    const terrainElev   = editingBimModelRef.current === bimFileKey
                        ? (map.queryTerrainElevation([modelLongitude, modelLatitude]) ?? cachedTerrainElev)
                        : cachedTerrainElev;
                    const modelAltitude = modelElevation + terrainElev;
                    const scaling       = 1;

                    // ── Build renderCamera (VP × M, for Three.js rendering) ───
                    // Reused temps — render() allocates nothing. Math is identical
                    // to the prior allocate-every-frame version.
                    _scaleVec.set(scaling, scaling, scaling);
                    _vp.fromArray(args.defaultProjectionData.mainMatrix);
                    writeModelMatrix(_m, modelOrigin, modelAltitude).scale(_scaleVec);
                    renderCamera.projectionMatrix.multiplyMatrices(_vp, _m);   // VP × M, into the camera's own matrix

                    // camIFCPos = translation of (P⁻¹ · (VP×M))⁻¹
                    _p.fromArray(args.projectionMatrix).invert();              // _p = P⁻¹
                    _vm.multiplyMatrices(_p, renderCamera.projectionMatrix).invert();
                    _camPos.setFromMatrixPosition(_vm);
                    lodCamera.position.copy(_camPos);

                    if (model) {
                        model.box.getCenter(_center);
                        _lookTarget.set(0, _center.y, 0);
                    } else {
                        _lookTarget.set(0, 0, 0);
                    }
                    lodCamera.lookAt(_lookTarget);
                    lodCamera.fov    = args.fov * (180 / Math.PI) + 40;
                    lodCamera.aspect = map.getCanvas().width / map.getCanvas().height;
                    lodCamera.updateProjectionMatrix();  // rebuilds projectionMatrix from fov/aspect
                    lodCamera.updateMatrixWorld();       // rebuilds matrixWorld + matrixWorldInverse

                    if (model) {
                        model.useCamera(lodCamera);
                        const now = performance.now();
                        if (now - lastLodUpdate > 50) {
                            lastLodUpdate = now;
                            void fragments.core.update();
                        }
                        // Render-on-demand: only keep the frame loop alive while the
                        // camera recently moved (settle window, for fragment
                        // streaming) or this model is being edited. Idle map ⇒ no
                        // self-scheduled repaints ⇒ main thread freed (no freeze).
                        if (
                            editingBimModelRef.current === bimFileKey ||
                            now - lastMoveTime < SETTLE_MS
                        ) {
                            map.triggerRepaint();
                        }
                    }

                    this.renderer.resetState();
                    this.renderer.render(this.scene, renderCamera);
                },

                onRemove() {
                    if (onMapMove)    map.off("move",    onMapMove);
                    if (onMapMoveEnd) map.off("moveend", onMapMoveEnd);
                    if (model) {
                        model.dispose().catch(console.warn);
                        model = null;
                    }
                    // Dispose all Three.js GPU resources (geometries, materials, textures)
                    disposeThreeScene(scene);
                },
            };
        };

        void Promise.all(modelsToAdd.map(async (buildingModel) => {
            try {
                const { fragments } = await getOrCreateShared();

                const layerId = bimLayerId(buildingModel.bimFile.id);
                if (map.getLayer(layerId)) return;
                const scene = new THREE.Scene();
                scene.add(new THREE.AmbientLight(0xffffff, 0.8));
                const sun = new THREE.DirectionalLight(0xffffff, 1.0);
                sun.position.set(10, 20, 10);
                scene.add(sun);

                const customLayer = createCustomLayer(buildingModel, fragments, scene);
                if (!customLayer) return;

                map.addLayer(customLayer);
                addedLayersRef.current.add(layerId);

            } catch (err) {
                console.error("Error adding BIM layer:", err);
            }
        }));

    }, [map, bimModelsAddedToMap]);

    // Cleanup on unmount — dispose shared components and renderer
    React.useEffect(() => {
        return () => {
            if (map) {
                addedLayersRef.current.forEach(layerId => {
                    if (map.getLayer(layerId)) map.removeLayer(layerId);
                });
                addedLayersRef.current.clear();
            }
            if (sharedRef.current) {
                sharedRef.current.components.dispose();
                sharedRef.current = null;
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
        };
    }, [map]);

    return (
        <>
            {unplacedModel && (
                <PlaceOnMap
                    file={unplacedModel.bimFile}
                    gesture="dblclick"
                    onPlaced={(file, lat, lng, buildingId) => {
                        const building = buildingId === null
                            ? null
                            : buildings.find(candidate => candidate.id === buildingId) ?? null;
                        bimDispatch({ type: "REMOVE_BIM_FROM_MAP", payload: { bimModelId: String(file.id) } });
                        toggleBimToMap(bimDispatch, file, building);
                    }}
                    onCancel={() => bimDispatch({
                        type: "REMOVE_BIM_FROM_MAP",
                        payload: { bimModelId: String(unplacedModel.bimFile.id) },
                    })}
                />
            )}

            {bimModelsAddedToMap.map((buildingModel, index) => {
                const { lng, lat } = extractPositionAndRotation(
                    buildingModel.bimFile, buildingModel.building
                );
                const isLoading = loadingBuildings.has(
                    buildingModel.building?.id ?? buildingModel.bimFile.id
                );
                if (lng === null || lat === null) return null;
                return (
                    <React.Fragment key={buildingModel.bimFile.id + "-fragment-" + index}>
                        {isLoading && (
                            <Marker
                                key={buildingModel.bimFile.id + "-loading-animation" + index}
                                latitude={lat}
                                longitude={lng}
                                {...markerOcclusionProps}
                            >
                                <LR.Loader className="animate-spin w-6 h-6 text-gray-700" />
                            </Marker>
                        )}
                        {/* Invisible hit-target for right-click context menu on WebGL-rendered BIM models */}
                        {String(buildingModel.bimFile.id) !== editingBimModelId && (
                            <Marker
                                key={buildingModel.bimFile.id + "-ctx-target-" + index}
                                latitude={lat}
                                longitude={lng}
                                {...markerOcclusionProps}
                            >
                                <div
                                    className="w-10 h-10 opacity-0 cursor-context-menu"
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        openContextMenu({ x: e.clientX, y: e.clientY, item: { bimFile: buildingModel.bimFile } });
                                    }}
                                />
                            </Marker>
                        )}
                    </React.Fragment>
                );
            })}
            {editingBimModelId && (() => {
                const currentModel = bimModelsAddedToMap.find(bm => String(bm.bimFile.id) === editingBimModelId);
                if (!currentModel) return null;
                const { lng, lat, rotation, elevation } = extractPositionAndRotation(
                    currentModel.bimFile, currentModel.building
                );
                return (
                    <MapPlacementHost
                        file={currentModel.bimFile}
                        mode={editMode}
                        is3D
                        rotation={rotation}
                        anchor={() => ({
                            lng: tempPositionsRef.current[editingBimModelId]?.lng ?? lng ?? 0,
                            lat: tempPositionsRef.current[editingBimModelId]?.lat ?? lat ?? 0,
                            elevation: tempElevationsRef.current[editingBimModelId] ?? elevation ?? 0,
                        })}
                        preview={(next, nextRotation) => {
                            tempPositionsRef.current = {
                                ...tempPositionsRef.current,
                                [editingBimModelId]: { lat: next.lat, lng: next.lng },
                            };
                            tempElevationsRef.current = { ...tempElevationsRef.current, [editingBimModelId]: next.elevation };
                            tempRotationsRef.current = {
                                ...tempRotationsRef.current,
                                [editingBimModelId]: nextRotation * (180 / Math.PI),
                            };
                        }}
                        onRepaint={handleMapRepaint}
                        onDone={handleExitEditMode}
                    />
                );
            })()}

            {contextMenu && (
                <MapPlacementMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.item.bimFile}
                    is3D
                    isOnMap
                    onAction={handlePlacementMenuAction}
                    onClose={closeContextMenu}
                />
            )}
        </>
    );

};
