// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// app/point-clouds/upload/page.tsx
"use client";

import * as React from "react";

import { useSession } from "next-auth/react";
import { useOrganization } from "../../../../../hooks/organizations/organizations";
import { ProgressBar } from "../../../map/src/tools/AddTools/AddFile/ProgressBar";
import { Button, Input, ScrollArea } from '../../../../ui';
import { useAppConfigContext } from '../../../../../store/AppConfig/context'

const CONVERSION_STATUS = Object.freeze({
  STARTED: "conversion_started",
  DOWNLOAD: "download",
  CONVERT: "convert",
  UPLOAD: "upload",
  CLEAN_UP: "clean_up",
  FAILED: "failed",
  FINISHED: "finished",
});

// All possible status values:
// - local client-only phases: "idle", "creating", "uploading"
// - plus all statuses from the backend (CONVERSION_STATUS values)
type ConversionStatus =
  | "idle"
  | "creating"
  | "uploading"
  | (typeof CONVERSION_STATUS)[keyof typeof CONVERSION_STATUS];

type CreatePointCloudResponse = {
  pointCloud: {
    id: string;
    name: string;
  };
  upload: {
    uploadUrl: string;
  };
};

type StartConversionResponse = {
  jobId: string;
};

type UploadPointCloudPageProps = {
  onGoBackButtonClick?: () => void;
};

export default function UploadPointCloudPage({
  onGoBackButtonClick,
}: UploadPointCloudPageProps) {
  const { state: appConfigState } = useAppConfigContext()
  const API_BASE = appConfigState.runtimeConfig.pointcloudApiUrl ?? 'http://localhost:5101'
  const { data: session } = useSession();
  const organizationId = session?.user?.organizationId ?? null;
  const { organization } = useOrganization(organizationId ? organizationId.toString() : null);

  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState<ConversionStatus>("idle");
  const [pointCloudId, setPointCloudId] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [logLines, setLogLines] = React.useState<string[]>([]);

  const esRef = React.useRef<EventSource | null>(null);

  const appendLog = React.useCallback((...parts: unknown[]) => {
    const line = parts
      .map((p) => (typeof p === "string" ? p : JSON.stringify(p, null, 2)))
      .join(" ");
    setLogLines((prev) => [...prev, line]);
  }, []);

  React.useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
      }
    };
  }, []);

  async function createPointCloud(
    name: string,
  ): Promise<CreatePointCloudResponse> {
    const res = await fetch(`${API_BASE}/point-cloud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, organizationId, organizationName: organization?.name }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Create point-cloud failed: ${msg || res.status}`);
    }

    return res.json();
  }

  function uploadToPresignedUrl(
    url: string,
    file: File,
    onProgress: (pct: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url, true);

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            onProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function startConversion(
    pointCloudId: string,
  ): Promise<StartConversionResponse> {
    const res = await fetch(
      `${API_BASE}/point-cloud/${encodeURIComponent(
        pointCloudId,
      )}/convert-to-potree`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: { sampling_method: "poisson" } }),
      },
    );

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`convert-to-potree failed: ${msg || res.status}`);
    }

    return res.json();
  }

  function subscribeToProgress(jobId: string) {
    if (!jobId) return;

    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(
      `${API_BASE}/events/convert-progress/${encodeURIComponent(jobId)}`,
    );
    esRef.current = es;

    es.onopen = () => appendLog("🟢 SSE connection opened");

    es.onerror = (event) => {
      appendLog("❌ SSE error:", event);
      setStatus((prev) =>
        prev === CONVERSION_STATUS.FINISHED ? prev : CONVERSION_STATUS.FAILED,
      );
    };

    es.addEventListener("progress", (event) => {
      try {
        const msgEvent = event as MessageEvent;
        const data = JSON.parse(msgEvent.data);

        appendLog(
          "[progress]",
          data.status ?? "",
          data.message ?? "",
          data.progress ?? "",
        );

        // If backend sends a status field matching our constants, use it
        if (
          data.status &&
          Object.values(CONVERSION_STATUS).includes(data.status)
        ) {
          setStatus(data.status as ConversionStatus);
        }

        if (typeof data.progress === "number") {
          setProgress(data.progress);
        }
      } catch (err) {
        appendLog("❌ Failed to parse progress event", err);
      }
    });

    es.addEventListener("finished", () => {
      appendLog("[finished] Conversion completed");
      setStatus(CONVERSION_STATUS.FINISHED);
      setProgress(100);
      es.close();
      esRef.current = null;
    });

    es.addEventListener("failed", () => {
      appendLog("[failed] Conversion failed");
      setStatus(CONVERSION_STATUS.FAILED);
      es.close();
      esRef.current = null;
    });

    es.addEventListener("connected", (event) => {
      const msgEvent = event as MessageEvent;
      appendLog("[connected]", msgEvent.data);
    });

    es.onmessage = (event) => {
      appendLog("[message]", event.data);
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !file) {
      alert("Please provide a name and select a LAZ/LAS file.");
      return;
    }

    setLogLines([]);
    setProgress(0);
    setPointCloudId(null);
    setJobId(null);
    setStatus("idle");

    try {
      appendLog("🟦 1) Creating point cloud...");
      setStatus("creating");

      const { pointCloud, upload } = await createPointCloud(name.trim());
      appendLog(pointCloud);
      setPointCloudId(pointCloud.id);

      appendLog("🟦 2) Uploading to presigned URL...");
      setStatus("uploading");
      await uploadToPresignedUrl(upload.uploadUrl, file, (pct) =>
        setProgress(pct),
      );
      appendLog("✔ Upload finished");

      appendLog("🟦 3) Starting conversion...");
      // Mark that the conversion has started (using backend status constant)
      setStatus(CONVERSION_STATUS.STARTED);
      const conversion = await startConversion(pointCloud.id);
      appendLog(conversion);

      const jobId = conversion.jobId;
      setJobId(jobId);

      appendLog("🟦 4) Subscribing to SSE…");
      subscribeToProgress(jobId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown upload error";
      appendLog("🔥 ERROR:", message);
      setStatus(CONVERSION_STATUS.FAILED);
      alert(message);
    }
  };

  const busy =
    status !== "idle" &&
    status !== CONVERSION_STATUS.FINISHED &&
    status !== CONVERSION_STATUS.FAILED;

  const statusLabel: string = (() => {
    switch (status) {
      case "idle":
        return "Idle";
      case "creating":
        return "Creating point cloud…";
      case "uploading":
        return "Uploading LAZ…";

      case CONVERSION_STATUS.STARTED:
        return "Conversion started…";
      case CONVERSION_STATUS.DOWNLOAD:
        return "Downloading source file…";
      case CONVERSION_STATUS.CONVERT:
        return "Running Potree converter…";
      case CONVERSION_STATUS.UPLOAD:
        return "Uploading Potree output…";
      case CONVERSION_STATUS.CLEAN_UP:
        return "Cleaning up temporary files…";
      case CONVERSION_STATUS.FINISHED:
        return "Done 🎉";
      case CONVERSION_STATUS.FAILED:
        return "Error – see log";
      default:
        return "Unknown status";
    }
  })();

  return (
    <div className="p-2 mt-16">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Upload & Convert Point Cloud
          </h1>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            if (onGoBackButtonClick) onGoBackButtonClick();
          }}
        >
          ← Back to list
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1.2fr]">
        {/* Upload card */}
        <div className="rounded-md border bg-background p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">Upload point cloud</span>
            <span className="text-xs text-muted-foreground">
              {statusLabel}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div className="space-y-1">
              <div className="text-xs font-medium">Name</div>
              <Input
                placeholder="e.g. Campus north wing"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium">LAZ / LAS file</div>
              <Input
                type="file"
                accept=".laz,.las"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                }}
              />
              {file && (
                <div className="text-[11px] text-muted-foreground">
                  Selected: <span className="font-medium">{file.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={!name.trim() || !file || busy}
                size="sm"
              >
                {busy ? "Working..." : "Upload & Convert"}
              </Button>

              <div className="flex flex-col text-[11px] text-muted-foreground">
                <span>
                  PointCloud ID:{" "}
                  <code className="text-xs">{pointCloudId ?? "—"}</code>
                </span>
                <span>
                  Job ID: <code className="text-xs">{jobId ?? "—"}</code>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Upload / conversion progress</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          </form>
        </div>

        {/* Log card */}
        <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <h2 className="font-semibold uppercase tracking-wide">
              Conversion log
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setLogLines([])}
            >
              Clear
            </Button>
          </div>

          <ScrollArea className="h-[200px] rounded border bg-background">
            <pre className="p-2 text-[11px] leading-snug whitespace-pre-wrap">
              {logLines.length ? logLines.join("\n") : "No activity yet."}
            </pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
