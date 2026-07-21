"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";

import { formatFrameTime } from "../../../../../datasets/src/wmsTime";

interface WmsTimeControlProps {
  /** Ascending frame timestamps (oldest → newest). */
  frames: string[];
  /** Called with the active frame timestamp whenever it changes. */
  onTimeChange: (time: string) => void;
  /** Card title (e.g. the dataset name). */
  label?: string;
  /** Frame advance interval while playing, ms. */
  stepMs?: number;
  /** WMS GetLegendGraphic image URL; shown under the slider when it loads. */
  legendUrl?: string;
}

/**
 * Floating scrub + play/pause control for a WMS time dimension. Defaults to the
 * latest frame; play advances oldest→newest on a loop. Purely presentational —
 * it owns only the current index + playing state and reports the active time up.
 */
export const WmsTimeControl: React.FC<WmsTimeControlProps> = ({
  frames,
  onTimeChange,
  label,
  stepMs = 500,
  legendUrl,
}) => {
  const [index, setIndex] = React.useState(Math.max(0, frames.length - 1));
  const [playing, setPlaying] = React.useState(false);
  const [legendOk, setLegendOk] = React.useState(true);

  // Reset legend visibility if the URL changes (different layer).
  React.useEffect(() => { setLegendOk(true); }, [legendUrl]);

  // Clamp + re-seat at the latest frame whenever the frame list changes.
  React.useEffect(() => {
    setIndex(Math.max(0, frames.length - 1));
  }, [frames.length]);

  // Report the active frame up whenever the index (or frame list) changes.
  React.useEffect(() => {
    const time = frames[index];
    if (time) onTimeChange(time);
  }, [index, frames, onTimeChange]);

  // Play loop.
  React.useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % frames.length);
    }, stepMs);
    return () => clearInterval(timer);
  }, [playing, frames.length, stepMs]);

  if (frames.length === 0) return null;

  const activeTime = frames[index];

  return (
    <div
      style={{
        // Laid out by the bottom-left flex stack it portals into (see MapViewer),
        // so no absolute positioning — it sits above the legend / dataset-manager cards.
        background: "#ffffff",
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        padding: "10px 12px",
        width: 260,
        font: "13px/1.3 system-ui, sans-serif",
        color: "#1a1a1a",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <button
          type="button"
          onClick={() => setPlaying(p => !p)}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            cursor: "pointer",
            border: "none",
            background: "#0d9488",
            color: "#fff",
            borderRadius: 4,
            width: 28,
            height: 28,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div style={{ fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label ?? "WMS time"}
        </div>
        <div style={{ fontVariantNumeric: "tabular-nums", color: "#475569" }}>
          {formatFrameTime(activeTime)}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={index}
        onChange={e => {
          setPlaying(false);
          setIndex(Number(e.target.value));
        }}
        style={{ width: "100%", display: "block", accentColor: "#0d9488" }}
      />
      {legendUrl && legendOk && (
        <img
          src={legendUrl}
          alt="Legend"
          onError={() => setLegendOk(false)}
          style={{
            display: "block",
            marginTop: 8,
            maxWidth: "100%",
            maxHeight: 220,
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
};
WmsTimeControl.displayName = "WmsTimeControl";
