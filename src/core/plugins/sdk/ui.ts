'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { usePluginDialogControls } from '../host/dialogs'
import { usePluginId } from '../host/scope'

export interface PluginDialogs {
  /** Opens one of this plugin's registered dialogs. `props` reaches the component as props. */
  open: (dialogId: string, props?: Record<string, unknown>) => void
  /** Closes the topmost instance of `dialogId`, or of any of this plugin's dialogs. */
  close: (dialogId?: string) => void
}

/**
 * Opens and closes this plugin's dialogs from any of its surfaces. The id comes from the
 * scope, so a plugin can only address its own.
 */
export function usePluginDialogs(): PluginDialogs {
  const pluginId = usePluginId()
  const controls = usePluginDialogControls()

  return React.useMemo(() => ({
    open: (dialogId, props) => controls.open(pluginId, dialogId, props),
    close: dialogId => controls.close(pluginId, dialogId),
  }), [controls, pluginId])
}
