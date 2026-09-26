# Changelog — @collabdt/plugin-kit

All notable changes to this package will be documented in this file.

The format is based on Keep a Changelog, and this package adheres to Semantic Versioning.
It versions and publishes independently of `@collabdt/core`; the core changelog is at the
repository root.

## [Unreleased]

### Added
- **`PluginFile` carries a file's placement:** `fileTransformX` / `Y` / `Z` (metres),
  `fileRotationX` / `Y` / `Z` (radians), `fileScale` (uniform) and `fileSourceUp` (`'y' | 'z'`).

### Deprecated
- **`PluginFile.x`, `y` and `z`.** Core no longer writes them, so for any file uploaded or moved
  since `@collabdt/core` switched to the transform columns they are `null` or stale. Read
  `fileTransformX` / `Y` / `Z` instead; the old fields will be removed in a later release.

## [0.6.0] - 2026-09-14

### Removed
- **The `./types/pointcloud` subpath export, in full.** Core no longer ships a standalone
  Potree point-cloud viewer — the BIM viewer renders point clouds through `potree-core` — so
  there is no host surface for a plugin to register against. Gone with it: the
  `pointcloud.tools` capability, and `pointcloud` from `PluginViewerTarget` and
  `PluginViewerName`.
- `dist/types/pointcloud.d.ts` from the shipped ambient types, so a scaffolded plugin no
  longer declares a module that resolves to nothing.

### Changed
- **`CapabilityRegistry` and `PluginContext` lose their third type parameter**, which was the
  point-cloud tool props. Both now read `<MapProps, BimProps, Legend>`.
- `viewer.tabs` and `viewer.legends` carry a `viewers` list of `'map' | 'bim'`. Omitting the
  field still means every viewer, which is now two rather than three.

### Migration
- Drop any `import … from '@collabdt/plugin-kit/types/pointcloud'`. There is no replacement:
  a plugin that targeted the point-cloud viewer has no surface to move to.
- `PluginContext<MapToolProps, BimToolProps, PointCloudToolProps, LegendRegistration>` becomes
  `PluginContext<MapToolProps, BimToolProps, LegendRegistration>` — the order is map, BIM,
  legend, and trailing parameters you do not use can still be left off. The same applies to
  `CapabilityRegistry`. `PointCloudPluginContext` is gone.
- A capability registered as `pointcloud.tools` is no longer a valid target and will not
  typecheck. Remove it.
- A `viewers: ['pointcloud']` list on a tab or legend no longer typechecks. Narrow it to
  `['map']` or `['bim']`, or drop the field to appear in both.
