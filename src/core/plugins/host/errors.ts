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

export class PluginManifestError extends Error {
  constructor(
    public pluginId: string,
    public errors: string[],
  ) {
    super(`Plugin "${pluginId}" has an invalid manifest: ${errors.join('; ')}`)
    this.name = 'PluginManifestError'
  }
}

export class PluginHostApiError extends Error {
  constructor(
    public pluginId: string,
    public declared: number,
    public supported: number,
  ) {
    super(
      `Plugin "${pluginId}" targets plugin host API ${declared}, but this version of @collabdt/core provides ${supported}`,
    )
    this.name = 'PluginHostApiError'
  }
}
