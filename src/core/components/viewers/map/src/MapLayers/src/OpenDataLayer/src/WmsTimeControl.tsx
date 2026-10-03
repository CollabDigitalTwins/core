"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from "lucide-react";
import * as React from "react";

import { Button } from "../../../../../../../ui/Button";
import { formatFrameTime } from "../../../../../datasets/src/wmsTime";

interface WmsTimeControlProps {
  /** Ascending frame timestamps (oldest → newest). */
  frames: string[];
  /** Called with the active frame timestamp whenever it changes. */
  onTimeChange: (time: string) => void;
  /** Heading beside the play button. Omit when the surrounding row already names the dataset. */
  label?: string;
  /** Frame advance interval while playing, ms. */
  stepMs?: number;
  /** WMS GetLegendGraphic image URL; shown under the slider when it loads. */
  legendUrl?: string;
  /** Frame to resume on when the first frames arrive, if it is among them. Defaults to the latest. */
  initialTime?: string;
}

const seatIndex = (frames: string[], time?: string): number => {
  const resumed = time ? frames.indexOf(time) : -1;
  return resumed >= 0 ? resumed : Math.max(0, frames.length - 1);
};

/**
 * Scrub + play/pause control for a WMS time dimension, nested under its dataset in the
 * applied-layers card. Play advances oldest→newest on a loop; the active time is reported up.
 */
export const WmsTimeControl: React.FC<WmsTimeControlProps> = ({
  frames,
  onTimeChange,
  label,
  stepMs = 500,
  legendUrl,
  initialTime,
}) => {
  const resumeTime = React.useRef(initialTime);
  const [index, setIndex] = React.useState(() => seatIndex(frames, initialTime));
  const [playing, setPlaying] = React.useState(false);
  const [legendOk, setLegendOk] = React.useState(true);

  React.useEffect(() => { setLegendOk(true); }, [legendUrl]);

  React.useEffect(() => {
    setIndex(seatIndex(frames, resumeTime.current));
    if (frames.length > 0) resumeTime.current = undefined;
  }, [frames]);

  React.useEffect(() => {
    const time = frames[index];
    if (time) onTimeChange(time);
  }, [index, frames, onTimeChange]);

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
    <div className="px-3 py-2 text-xs">
      <div className="mb-1 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setPlaying(p => !p)}
          aria-label={playing ? "Pause" : "Play"}
          className="h-6 w-6 shrink-0"
        >
          {playing ? <LR.Pause size={12} /> : <LR.Play size={12} />}
        </Button>
        <span className="flex-1 truncate text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{formatFrameTime(activeTime)}</span>
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
        aria-label={label}
        className="block w-full accent-current"
      />
      {legendUrl && legendOk && (
        <img
          src={legendUrl}
          alt="Legend"
          onError={() => setLegendOk(false)}
          className="mt-2 block max-h-56 max-w-full object-contain"
        />
      )}
    </div>
  );
};
WmsTimeControl.displayName = "WmsTimeControl";
