export class PluginActivationError extends Error {
  constructor(
    public pluginId: string,
    public cause: Error,
  ) {
    super(`Plugin "${pluginId}" failed to activate: ${cause.message}`)
    this.name = 'PluginActivationError'
  }
}
