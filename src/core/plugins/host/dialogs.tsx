'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

export interface OpenDialog {
  pluginId: string
  dialogId: string
  props: Record<string, unknown>
  /** Monotonic, so opening the same dialog twice stacks rather than replacing. */
  instanceId: number
}

interface DialogControls {
  open: (pluginId: string, dialogId: string, props?: Record<string, unknown>) => void
  close: (pluginId: string, dialogId?: string) => void
  closePlugin: (pluginId: string) => void
}

const DialogStackContext = React.createContext<OpenDialog[]>([])
const DialogControlsContext = React.createContext<DialogControls | null>(null)

/**
 * Holds every plugin dialog that is open. Provided by `PluginHostProvider` so the stack sits
 * above all of a plugin's surfaces: a dialog opened from a map tool's panel stays on screen
 * when that panel closes, which it could not do if the plugin rendered its own overlay.
 *
 * State only, and imports nothing from `./provider` on purpose — the provider renders this,
 * so reaching back would make the module graph a cycle. `PluginDialogHost` does the
 * rendering and is mounted separately.
 */
export function PluginDialogProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = React.useState<OpenDialog[]>([])
  const nextInstance = React.useRef(0)

  const controls = React.useMemo<DialogControls>(() => ({
    open: (pluginId, dialogId, props = {}) => {
      nextInstance.current += 1
      const instanceId = nextInstance.current
      setStack(previous => [...previous, { pluginId, dialogId, props, instanceId }])
    },
    // Closes the topmost match, so a plugin that stacked the same dialog twice does not lose
    // both to one call.
    close: (pluginId, dialogId) => {
      setStack((previous) => {
        const matches = (entry: OpenDialog) =>
          entry.pluginId === pluginId && (dialogId === undefined || entry.dialogId === dialogId)

        for (let index = previous.length - 1; index >= 0; index -= 1) {
          if (matches(previous[index])) {
            return [...previous.slice(0, index), ...previous.slice(index + 1)]
          }
        }

        return previous
      })
    },
    closePlugin: (pluginId) => {
      setStack(previous => (
        previous.some(entry => entry.pluginId === pluginId)
          ? previous.filter(entry => entry.pluginId !== pluginId)
          : previous
      ))
    },
  }), [])

  return (
    <DialogControlsContext.Provider value={controls}>
      <DialogStackContext.Provider value={stack}>
        {children}
      </DialogStackContext.Provider>
    </DialogControlsContext.Provider>
  )
}

/** Throws outside the provider rather than silently doing nothing when a plugin opens a dialog. */
export function usePluginDialogControls(): DialogControls {
  const controls = React.useContext(DialogControlsContext)

  if (controls === null) {
    throw new Error(
      'Plugin dialogs are only available inside PluginHostProvider, which owns the dialog stack.',
    )
  }

  return controls
}

export function usePluginDialogStack(): OpenDialog[] {
  return React.useContext(DialogStackContext)
}
