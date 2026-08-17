'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog'
import { usePluginMessage } from '../sdk/messages'

import { usePluginDialogControls, usePluginDialogStack } from './dialogs'
import { usePluginConfigs, usePluginContributions } from './provider'
import { PluginScopeProvider } from './scope'

import type { OpenDialog } from './dialogs'
import type { DialogRegistration } from '../sdk/types'

const SIZE_CLASS: Record<NonNullable<DialogRegistration['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
}

/**
 * Renders whatever plugin dialogs are open. Mounted once, by `AppProvider`, inside
 * `PluginHostProvider` — never by a plugin, and never more than once.
 */
export function PluginDialogHost() {
  const stack = usePluginDialogStack()
  const registrations = usePluginContributions('ui.dialogs')
  const { close } = usePluginDialogControls()

  return (
    <>
      {stack.map((entry) => {
        const registration = registrations.find(
          candidate => candidate.pluginId === entry.pluginId && candidate.id === entry.dialogId,
        )

        // Its plugin may have been disabled mid-flight, leaving nothing to render.
        if (!registration) return null

        return (
          <PluginDialogFrame
            key={entry.instanceId}
            entry={entry}
            registration={registration}
            onClose={() => close(entry.pluginId, entry.dialogId)}
          />
        )
      })}
    </>
  )
}

interface FrameProps {
  entry: OpenDialog
  registration: DialogRegistration & { pluginId: string }
  onClose: () => void
}

function PluginDialogFrame({ entry, registration, onClose }: FrameProps) {
  const title = usePluginMessage(entry.pluginId, registration.titleKey, registration.titleKey)
  const configs = usePluginConfigs()
  const Body = registration.component as React.ComponentType<Record<string, unknown>>

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      {/* No description: the body is the plugin's, so core has nothing to say about it.
          Passing undefined is how Radix is told that is deliberate rather than an omission. */}
      <DialogContent
        className={SIZE_CLASS[registration.size ?? 'md']}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <PluginScopeProvider pluginId={entry.pluginId} config={configs[entry.pluginId]}>
          <Body {...entry.props} close={onClose} />
        </PluginScopeProvider>
      </DialogContent>
    </Dialog>
  )
}
