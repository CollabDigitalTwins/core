"use client"

import * as React from "react";
import * as THREE from "three";
import { useSearchParams } from "next/navigation";
import { loadAllAssets } from "./utils/potreeLoader";
import { BuildingsContext, PointCloudContext } from '../../../store'
import { restoreCameraFromUrl } from "./utils/restoreCameraFromUrl";
import { PointCloudLoadingState } from "./src/PointCloudLoadingState";
import { useFilesByBuildingId } from '../../../hooks/files/files'
import { ViewportGizmo } from './src/ViewportGizmo';
import { usePointCloudCoordinateSystem } from '../useCoordinateSystem';


const API_BASE =
  process.env.NEXT_PUBLIC_POINTCLOUD_API_URL ?? "http://localhost:5101";

export function PointCloudViewer() {
  // Enforce Z-up coordinate system for Potree. Resets to Y-up on unmount
  // so the BIM viewer doesn't inherit Z-up when switching viewers.
  usePointCloudCoordinateSystem();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const viewerRef = React.useRef<any | null>(null);
  const gizmoRef = React.useRef<ViewportGizmo | null>(null);
  // Tracks Potree point cloud objects keyed by point cloud ID
  const loadedCloudsRef = React.useRef<Map<string, any>>(new Map());
  // IDs currently being fetched/loaded — prevents duplicate loads while async is in-flight
  const pendingIdsRef = React.useRef<Set<string>>(new Set());
  const cameraRestoredRef = React.useRef(false);

  const { state: pointCloudState, dispatch: pointCloudDispatch } = React.useContext(PointCloudContext)
  const PointCloudGlobalState = pointCloudState.pointcloud

  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings

  const searchParams = useSearchParams()

  // Get files for the building to check if there are LAZ/LAS files
  const { files, isError: filesError } = useFilesByBuildingId(building?.id)
  const hasPointCloudFiles = React.useMemo(() =>
    !filesError && files.some(file => {
      const ext = file.extension?.toLowerCase()
      if (!ext) return false
      return ext === "laz" || ext === "las"
    }),
    [files, filesError])

  // --- Load CSS/JS assets once
  React.useEffect(() => {
    (async () => {
      try {
        await loadAllAssets()
        pointCloudDispatch({ type: "SET_READY", payload: { ready: true } })
      }
      catch (err) {
        console.error("PointCloudViewer - Failed to load assets", err)
      }
    })();
  }, []);

  // --- Init viewer once when ready. Separate from cloud loading so the viewer
  //     persists across toggle on/off of individual point clouds.
  React.useEffect(() => {
    if (!PointCloudGlobalState.ready || !containerRef.current || !(window as any)?.Potree) return;

    const Potree = (window as any).Potree;
    const el = containerRef.current;

    // Clear tracking state since we're creating a fresh viewer
    loadedCloudsRef.current.clear();
    pendingIdsRef.current.clear();
    cameraRestoredRef.current = false;

    const viewer = new Potree.Viewer(el);
    viewerRef.current = viewer;

    viewer.setEDLEnabled(true);
    viewer.setFOV(60);
    viewer.setPointBudget(10_000_000);
    viewer.loadSettingsFromURL();
    viewer.setBackground("white");

    const gizmo = new ViewportGizmo(viewer);
    gizmoRef.current = gizmo;
    gizmo.enabled = true;

    pointCloudDispatch({
      type: "INIT",
      payload: {
        initialState: {
          ready: true,
          viewer: viewerRef.current,
        }
      }
    })

    return () => {
      try {
        if (gizmoRef.current) {
          gizmoRef.current.dispose();
          gizmoRef.current = null;
        }
        const v = viewerRef.current;
        // Potree's render loop re-schedules itself via requestAnimationFrame with no stop API;
        // shadow it with a no-op so it halts on unmount instead of running forever against a
        // disposed renderer (otherwise a new loop accumulates on every visit).
        if (v) {
          v.loop = () => { };
          v.update = () => { };
        }
        if (v?.scene?.pointclouds) {
          v.scene.pointclouds.forEach((pc: any) => {
            v.scene.removePointCloud?.(pc) ?? v.scene.scene?.remove?.(pc);
          });
        }
        v?.renderer?.dispose?.();
      } catch { }
      loadedCloudsRef.current.clear();
      pendingIdsRef.current.clear();
      viewerRef.current = null;
      el.innerHTML = "";
    };
  }, [PointCloudGlobalState.ready]);

  // --- Add/remove point clouds whenever loadedPointCloudIds changes or the
  //     viewer is (re)initialized (PointCloudGlobalState.viewer updates on INIT).
  React.useEffect(() => {
    const viewer = viewerRef.current;
    if (!PointCloudGlobalState.ready || !viewer) return;

    const Potree = (window as any).Potree;
    if (!Potree) return;

    const currentIds = new Set(PointCloudGlobalState.loadedPointCloudIds);
    const alreadyLoadedIds = new Set(loadedCloudsRef.current.keys());

    // Remove point clouds no longer in the list.
    // Potree classic has no removePointCloud() — splice from the internal
    // pointclouds array and remove from the Three.js scene separately.
    for (const id of alreadyLoadedIds) {
      if (!currentIds.has(id)) {
        const pc = loadedCloudsRef.current.get(id);
        if (pc) {
          try {
            const pcs: any[] = viewer.scene.pointclouds ?? [];
            const idx = pcs.indexOf(pc);
            if (idx !== -1) pcs.splice(idx, 1);
            viewer.scene.scene?.remove(pc);
          } catch { }
          loadedCloudsRef.current.delete(id);
          pendingIdsRef.current.delete(id);
          try { viewer.fitToScreen(); } catch { }
        }
      }
    }

    // Add newly requested point clouds.
    // Skip if already tracked in loadedCloudsRef OR still in-flight in pendingIdsRef
    // — prevents duplicate loads when Effect 2 fires again before the callback runs.
    for (const id of currentIds) {
      if (alreadyLoadedIds.has(id) || pendingIdsRef.current.has(id)) continue;

      pendingIdsRef.current.add(id);
      ; (async () => {
        try {
          const res = await fetch(`${API_BASE}/point-cloud/${encodeURIComponent(id)}`);
          const data = await res.json();
          const url = `${API_BASE}/private/${data.bucket}/${data.potreeMetadataFileKey}`;

          Potree.loadPointCloud(url, id, (e: any) => {
            pendingIdsRef.current.delete(id);
            // Bail if the viewer was torn down (or re-init'd) while this load was in flight —
            // the init-effect cleanup nulls viewerRef, so this guard avoids attaching to a dead viewer.
            if (viewerRef.current !== viewer) return;
            try {
              viewer.scene.addPointCloud(e.pointcloud);
              loadedCloudsRef.current.set(id, e.pointcloud);

              const mat = e.pointcloud.material;
              mat.size = 1;
              mat.pointSizeType = Potree.PointSizeType.ADAPTIVE;

              const restored = !cameraRestoredRef.current && restoreCameraFromUrl(viewer, searchParams)
              cameraRestoredRef.current = true;
              if (!restored) viewer.fitToScreen();

              if (gizmoRef.current) {
                gizmoRef.current.add();
              }
            } catch (err) {
              console.error("[PointCloudViewer] Error adding point cloud", err);
            }
          });
        } catch (err) {
          pendingIdsRef.current.delete(id);
          console.error("[PointCloudViewer] Error fetching point cloud metadata", err);
        }
      })();
    }
  }, [PointCloudGlobalState.loadedPointCloudIds, PointCloudGlobalState.viewer, PointCloudGlobalState.ready]);

  const { loadedPointCloudIds } = PointCloudGlobalState;
  const hasLoadedClouds = loadedPointCloudIds.length > 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
      }}
    >
      {/* Potree container — always rendered so the viewer can measure its dimensions on init.
          PointCloudLoadingState sits above it via z-index when no clouds are loaded. */}
      <div>
        <div
          className={`pointer-events-none absolute inset-0 `}
          style={{
            zIndex: 9,
            background: 'radial-gradient(circle at center, rgba(220,220,220,0) 0%, rgba(220,220,220,0) 50%, rgba(220,220,220,0.9) 100%)',
            mixBlendMode: 'multiply'
          }}
        />
        <div
          ref={containerRef}
          className="potree_container"
          style={{
            position: "absolute",
            inset: 0,
            backgroundSize: "cover",
          }}
        />
      </div>

      {/* Show PointCloudLoadingState only when there are no point cloud files uploaded at all.
          Rendered after the container so it layers on top (higher DOM order = higher paint order). */}
      {!hasPointCloudFiles && !hasLoadedClouds && (
        <div className="absolute inset-0" style={{ zIndex: 10 }}>
          <PointCloudLoadingState />
        </div>
      )}
    </div>
  );
}
