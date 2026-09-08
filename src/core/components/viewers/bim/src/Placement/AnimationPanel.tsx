'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'

import { Button } from '../../../../ui/Button'
import { Card, CardContent, CardHeader } from '../../../../ui/Card'
import { Label } from '../../../../ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/Select'
import { Separator } from '../../../../ui/Separator'
import { Slider } from '../../../../ui/Slider'

import { MAX_SPEED, MIN_SPEED } from '../ModelManager/modelAnimation'

import type { AnimationState } from '../ModelManager/modelAnimation'

export interface AnimationPanelProps {
  name: string
  clips: string[]
  state: AnimationState
  labels: Record<string, string>
  onClipChange: (clipIndex: number) => void
  onPlayingChange: (playing: boolean) => void
  onSpeedChange: (speed: number) => void
  onClose: () => void
}

/** Session-only playback controls for a loaded model that carries animation clips. */
export function AnimationPanel({
  name,
  clips,
  state,
  labels,
  onClipChange,
  onPlayingChange,
  onSpeedChange,
  onClose,
}: AnimationPanelProps) {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-12 z-50 w-72 pointer-events-auto">
      <Card className="shadow-lg border bg-background/95 backdrop-blur-sm">
        <CardHeader className="p-3 pb-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <LR.Film size={15} className="shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{labels.title}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
              <LR.X size={13} />
            </Button>
          </div>
          <p className="truncate text-xs text-muted-foreground" title={name}>{name}</p>
          <p className="text-[11px] leading-tight text-muted-foreground/70">{labels.notSaved}</p>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-3 p-3">
          {clips.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{labels.clip}</Label>
              <Select
                value={String(state.clipIndex)}
                onValueChange={(value) => onClipChange(Number(value))}
              >
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {clips.map((clip, index) => (
                    <SelectItem key={clip + index} value={String(index)} className="text-xs">
                      {clip}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => onPlayingChange(!state.playing)}
          >
            {state.playing
              ? <><LR.Pause size={13} className="mr-1" />{labels.pause}</>
              : <><LR.Play size={13} className="mr-1" />{labels.play}</>}
          </Button>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-muted-foreground">{labels.speed}</Label>
              <span className="text-[10px] text-muted-foreground">{state.speed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[state.speed]}
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={0.1}
              onValueChange={([speed]) => onSpeedChange(speed)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
