# Changelog — @collabdt/plugin-kit

All notable changes to this package will be documented in this file.

The format is based on Keep a Changelog, and this package adheres to Semantic Versioning.
It versions and publishes independently of `@collabdt/core`; the core changelog is at the
repository root.

## [Unreleased]

### Added
- `BimToolProps.floorplan` (`PluginFloorplan`, `FloorplanStorey`, `PlanPoint`, `SketchKind`, `PlanOverlayShape`,
  `PlanOverlayOptions`, `PlanFootprint`): storeys, opening plans, projecting their lines (`generateLines`,
  `hasLines`), drawing (`drawShape`) and reshaping (`editShape`, `finishEditingShape`, `isEditingShape`) outlines,
  fitting the view to one (`frame`), reading IFCSPACE floor outlines (`getSpaceFootprints`), and per-plugin
  overlays (`setOverlay` with `onShapeClick` and `replacesSpaces`, `clearOverlay`). `cancelDrawing()` ends a
  drawing or a shape edit.
- `BimToolProps.modelPlacement` (`PluginModelPlacement`, `ModelPlacementWatcher`, `ModelPlacementChange`), to keep
  world-coordinate data on a model the user moves or turns.
- `BimToolProps.buildingId` and `BimToolProps.appearance` (`PluginBimAppearance`, `BimAppearanceGroup`,
  `BimAppearance`).
- `DataPageTable` and `DataPageCustom`: a `data.pages` registration may pass its own `component` instead of
  `useRows` / `columns`.
- `@collabdt/core/plugins-sdk/charts` in `PLUGIN_EXTERNALS` and its ambient declarations, with `ChartConfig` and
  the chart prop types under `@collabdt/plugin-kit/types/charts`.
- `ConfirmDialog` (`ConfirmDialogProps`) in the `@collabdt/core/plugins-sdk/components` declarations and `toast` in
  the `@collabdt/core/plugins-sdk/ui` ones.
- `apply()` and `remove()` on `PluginDatasetState` in the `@collabdt/core/plugins-sdk/data` declarations.
  They need a platform running `@collabdt/core` with the same addition.

### Changed
- `DataPageRegistration` is now `DataPageTable | DataPageCustom`.

## [0.9.0] - 2026-10-03

### Added
- **`map.datasets` capability** with `DatasetRegistration`, `PluginDatasetSource` and `PluginFeatureCollection`,
  for a dataset listed in the platform's Datasets menu under Organizational or Live Data.
- `usePluginDataset(id)` and `PluginDatasetState` in the `@collabdt/core/plugins-sdk/data` declarations.
- `LegendRegistration.dataset`, `LegendRow.visible` / `onVisibleChange`, `controls` in the `useLegend` result,
  and `PluginNode`.

## [0.8.0] - 2026-10-02

### Changed
- **`PluginViewerName` and `ViewerNames` say `'plugins'` instead of `'extensions'`**, matching `@collabdt/core`.

### Migration
- Replace `ViewerNames.extensions` or `'extensions'` with `ViewerNames.plugins` / `'plugins'`.

## [0.7.0] - 2026-09-26

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
