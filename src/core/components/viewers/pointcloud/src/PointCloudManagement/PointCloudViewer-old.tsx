"use client"

import * as React from "react";
import * as THREE from "three";
import { useSearchParams } from "next/navigation";
import { loadAllAssets } from "../../utils/potreeLoader";
import { BuildingsContext, PointCloudContext } from '../../../../../store'
import { PointCloudManagementTable } from "./PointCloudManagementTable";
import { restoreCameraFromUrl } from "../../utils/restoreCameraFromUrl";
import { PointCloudLoadingState } from "../PointCloudLoadingState";
import { useFilesByBuildingId } from '../../../../../hooks/files/files'
import { Button } from '../../../../ui';


const API_BASE =
    process.env.NEXT_PUBLIC_POINTCLOUD_API_URL ?? "http://localhost:5101";

type PointCloud = {
    id: string;
    name: string;
    bucket: string;
    point_cloud_uploaded: boolean;
    point_cloud_potree_converted: boolean;
    createdAt: string;
    potree_metadata_presigned_url?: string | null;
    potree_metadata_file_key?: string | null;
};

export function PointCloudViewer() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const viewerRef = React.useRef<any | null>(null);
  const { state: pointCloudState, dispatch: pointCloudDispatch } = React.useContext(PointCloudContext)
  const PointCloudGlobalState = pointCloudState.pointcloud
  const [pointCloudUrl, setPointCloudUrl] = React.useState("")

  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings
  let buildingId: number;
  
  const searchParams = useSearchParams()
  const pointCloudId = searchParams.get('pointCloudId')

  if (building) buildingId = building.id

  // Get files for the building to check if there are LAZ/LAS files
  const { files } = useFilesByBuildingId(building?.id)
  const hasPointCloudFiles = React.useMemo(() => 
    files.some(file => {
      const ext = file.extension.toLowerCase()
      return ext === "laz" || ext === "las"
    }), 
  [files])

  let gridZ = 0
  
  if (building) buildingId = building.id
  else if (pointCloudUrl) buildingId = Number(pointCloudUrl)
    
  // --- load CSS/JS once
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

  React.useEffect(() => {
    if (!PointCloudGlobalState.ready || !containerRef.current || !(window as any)?.Potree) return;
    if(!pointCloudId) return;
    const fetchPointCloud = async () => {
      try {
        const encodedPointCloudId = encodeURIComponent(pointCloudId || '');
        const res = await fetch(`${API_BASE}/point-cloud/${encodedPointCloudId}`);
        const data: PointCloud = await res.json();
        const pointCloudUrlEncoded = `${API_BASE}/private/${data.bucket}/${data.potree_metadata_file_key}`        
        setPointCloudUrl(pointCloudUrlEncoded)
      } 
      catch(err){
        console.log(err)
      }
    }
    fetchPointCloud()

  }, [PointCloudGlobalState.ready, pointCloudId])


  // --- init viewer and load cloud
  React.useEffect(() => {
    if (!PointCloudGlobalState.ready || !containerRef.current || !(window as any)?.Potree) return;

    const Potree = (window as any).Potree;
    const el = containerRef.current;

    const viewer = new Potree.Viewer(el);
    viewerRef.current = viewer;

    viewer.setEDLEnabled(true);
    viewer.setFOV(60);
    viewer.setPointBudget(10_000_000);
    viewer.loadSettingsFromURL();
    viewer.setBackground("white");

    // Load cloud
    Potree.loadPointCloud(pointCloudUrl, "cloud", (e: any) => {
      try {
        viewer.scene.addPointCloud(e.pointcloud);
        const mat = e.pointcloud.material;
        mat.size = 1;
        mat.pointSizeType = Potree.PointSizeType.ADAPTIVE;
        e.pointcloud.position.x += 3;
        e.pointcloud.position.y -= 3;
        e.pointcloud.position.z += 4;

        // Restore camera from URL or fit to screen
        const cameraRestored = restoreCameraFromUrl(viewer, searchParams)
        if (!cameraRestored) {
          viewer.fitToScreen();
        }
      } catch (err) {
        console.error("[PointCloudViewer] Error adding point cloud", err);
      }
    });

    //dispatch to update global state
    pointCloudDispatch({
      type: "INIT",
      payload: {
        initialState: {
          ready: true,
          viewer: viewerRef.current
        }
      }
    })

    // cleanup
    return () => {
      try {
        // Best-effort cleanup (Potree classic has no single dispose)
        const v = viewerRef.current;
        if (v?.scene?.pointclouds) {
          v.scene.pointclouds.forEach((pc: any) => {
            v.scene.removePointCloud?.(pc) ?? v.scene.scene?.remove?.(pc);
          });
        }
        v?.renderer?.dispose?.();
      } catch { }
      viewerRef.current = null;
      el.innerHTML = "";
    };


  }, [PointCloudGlobalState.ready, pointCloudUrl]);

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
      {!pointCloudId &&
        <PointCloudManagementTable></PointCloudManagementTable>
      }
       <div>
          <div
            className={`pointer-events-none absolute inset-0 ${!pointCloudId ? 'hidden':'inline'}`}
            style={{
              zIndex: 9,
              background: 'radial-gradient(circle at center, rgba(220,220,220,0) 0%, rgba(220,220,220,0) 50%, rgba(220,220,220,0.9) 100%)',
              mixBlendMode: 'multiply'
            }}
          />
          <div
            ref={containerRef}
            className={`potree_container ${!pointCloudId ? 'hidden':'inline'}`}
            style={{
              position: "absolute",
              inset: 0,
              backgroundSize: "cover",
            }}
          />

            <Button 
            className={`absolute right-5 top-5 ${!pointCloudId ? 'hidden':'inline'}`}
           
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.delete('pointCloudId');
              const newUrl = `${window.location.pathname}?${params.toString()}`;
              window.history.pushState({}, '', newUrl);
            }}
            >
            Go Back
            </Button>
        </div>
    </div>
      
  );
}
