// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export class PluginActivationError extends Error {
  constructor(
    public pluginId: string,
    public cause: Error,
  ) {
    super(`Plugin "${pluginId}" failed to activate: ${cause.message}`)
    this.name = 'PluginActivationError'
  }
}
