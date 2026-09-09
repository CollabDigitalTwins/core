'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Progress } from '../../Progress'

import { setToastRenderer } from './uploadProgress'

import type { UploadPhase } from './uploadProgress'

interface UploadProgressBarProps {
  label: string
  progress: number | null
}

export function UploadProgressBar({ label, progress }: UploadProgressBarProps) {
  return (
    <div className="w-full min-w-56 space-y-1.5 rounded-md bg-background px-3 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{label}</span>
        {progress != null && <span className="shrink-0 tabular-nums">{Math.round(progress)}%</span>}
      </div>
      <Progress value={progress} />
    </div>
  )
}

/** Mounted once so the task store can draw a toast without importing JSX. */
export function UploadProgressToasts() {
  React.useEffect(() => {
    setToastRenderer(task => <UploadProgressBar label={task.label} progress={task.progress} />)
    return () => setToastRenderer(null)
  }, [])

  return null
}

export function useUploadLabels() {
  const t = useTranslations('Upload')
  return React.useMemo(() => ({
    labelFor: (phase: UploadPhase, name: string) => t(phase, { name }),
  }), [t])
}
