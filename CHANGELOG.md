
# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

### Fixed
- **A `.las`, `.laz` or `.e57` added through the BIM viewer's Add to BIM toolbar was never
  recognised as a point cloud.** The tool had its own upload path that wrote every file as
  `type: 'bim-file'` through the generic presigned route, so no point cloud record was
  created and no conversion job ran; the file surfaced under Models instead of Point Clouds.
  `useFilePlacement` now routes every upload through the same `useBimFileIntake` hook the
  rest of the BIM viewer uses, and its own `toast.loading` spinner is gone in favour of the
  shared upload progress bar.
- **A point cloud created through `/api/point-cloud` never appeared in the BIM viewer.**
  Classification was by extension alone, and the converter records no extension.
  `isPointCloudFile` now accepts either signal — `type === 'point-cloud-file'` or a cloud
  extension — matching what `BuildingsTools` already did, so existing rows need no backfill.
  The BIM branch of the File tab likewise accepts `type === 'bim-file'` alongside ifc/frag.
  Separately, the source format now travels from the picker through the proxy to the
  converter, which stores it on the record and in the object key, so an E57 keeps its
  extension for the worker to read.

### Added
- **Point clouds are uploaded and converted from the BIM viewer's File tab.** The Point
  Clouds section gained an upload button, an upload progress bar and a conversion progress
  bar, plus per-row recovery for the two ways the pipeline fails: re-run conversion when the
  object uploaded but never converted, and re-upload when the upload itself died.
  New `viewers/shared/pointcloud/pointCloudConversion` holds `createPointCloud`,
  `startConversion` and `watchConversion`; `viewers/bim/src/PointClouds/usePointCloudUpload`
  drives the state machine. `createPointCloud` takes the source extension as its second
  argument, ahead of `buildingId`.
- **E57 is accepted alongside LAS and LAZ.** Rendering an E57 also needs the converter
  service to transcode it, which ships separately.
- **A camera tool for the BIM viewer**, in the Settings tab rather than the toolbar, split
  per control the way the existing settings blocks are — `NavigationMode`, `WalkSettings`,
  and a `useCameraNavigation` hook both share:
  `CameraNavigation` exposes orbit and walk navigation modes, a walk speed, and an elevation
  lock with the height editable in metres. Movement is WASD or the arrow keys, with Q and E
  for down and up; deliberate vertical input re-bases the lock rather than being cancelled by
  it. Walk mode is refused under an orthographic projection and falls back to orbit if the
  projection changes mid-walk.
- An octree bounding-box toggle in the BIM point cloud settings, via a new
  `showBoundingBoxes` field on `PointCloudAppearance`.
- `isPointCloudFile`, `isPointCloudExtension`, `POINT_CLOUD_ACCEPT`,
  `POINT_CLOUD_EXTENSIONS`, `stripPointCloudExtension` and `uniquePointCloudName` in
  `viewers/bim/src/PointClouds/pointCloudFiles`.
- i18n keys in the `PointCloudManagement`, `PointCloudSettings` and `CameraSettings`
  namespaces, for en, es and fr.

### Changed
- The render mode and perspective/orthographic switches moved from their own settings blocks
  into the new Camera section, so every camera control sits together — render mode first.
  `RenderMode` and `ToggleProjection` are unchanged and are now rendered by `CameraSettings`.
- The BIM File tab lists a point cloud as soon as it exists, not only once converted, so an
  in-flight or failed conversion is visible instead of falling into the generic Files list.
  An unconverted row offers only info and delete.
- `uploadFileWithProgress` is typed, and no longer sends an empty `Content-Type` header for
  a file whose type the browser cannot determine — which MinIO rejects on a presigned PUT.
- `BimPointCloudsSetup` requires an `apiBase`, and `BimPointClouds` exposes it as
  `apiBase`, so the upload panel and the loader cannot disagree about the service base.

### Removed
- **The standalone Potree point-cloud viewer, in full.** The BIM viewer renders point clouds
  through `potree-core` and no longer needs the vendored Potree 1.x globals. Gone:
  `components/viewers/pointcloud/`, `store/PointCloud/` (and its `PointCloudProvider`),
  `plugins/sdk/pointCloudViewer` (`usePointCloudViewer`, `PointCloudToolProps`), the
  `pointcloud` member of `ViewerNames`, the `pointcloud.tools` plugin capability, and the
  `MeasurePointCloudTool`, `PerformanceSettings`, `PointCloudLoadingState` and
  `pointcloudToolbarTools` i18n namespaces.
- The `potree` and `potree-cdt` dependencies. `potree-core` stays — it is what the BIM
  viewer uses. Consumers can drop the `copyPotree` postinstall step and the
  `public/vendors/potree` directory it maintained.
- The map popover's "open point cloud" building action, which now duplicates "open BIM viewer".
- `@collabdt/plugin-kit`: the `./types/pointcloud` subpath, `pointcloud.tools`, and
  `pointcloud` from `PluginViewerTarget` and `PluginViewerName`. `CapabilityRegistry` and
  `PluginContext` lose their third type parameter.
- `create-cdt-plugin`: the point-cloud surface and its `ExamplePointcloud` template.
- `selectPointCloudFiles` from `viewers/bim/src/PointClouds/pointCloudFiles`. Nothing used
  it once the File tab began routing by type and extension.

### Migration
- Any caller of `BimPointClouds.setup()` must pass `apiBase`, the same value it already
  passes to `createHttpPointCloudSource`:
  ```ts
  const apiBase = resolvePointCloudApiBase(pointcloudApiUrl)
  clouds.setup({ world, apiBase, source: createHttpPointCloudSource(apiBase) })
  ```
- Replace `selectPointCloudFiles(files)` with `files.filter(isRenderablePointCloud)`.
- A consumer overriding the `PointCloudAppearance` object wholesale must add
  `showBoundingBoxes`; partial patches through `setAppearance` are unaffected.
- Remove `node ./build_potree/copyPotree.js` from your `postinstall`, drop the
  `potree-cdt` dependency, and delete `public/vendors/potree`. Nothing regenerates it.
- `?viewer=pointcloud` links now fall back to the map with the parameter stripped, which
  `Viewer` already did for any viewer an organization has not enabled. Point clouds are
  reached through the BIM viewer.
- `SidebarProvider` / `Sidebar` and `ViewerSidebar` no longer take `pointcloudApiUrl`;
  `Viewer` still does, and that is the path the BIM viewer's clouds use.
- A plugin registering `pointcloud.tools` must move to `bim.tools`. A `viewer.tabs` or
  `viewer.legends` contribution naming `pointcloud` should drop it — the host warns and
  renders nothing. Bind `CapabilityRegistry`/`PluginContext` type parameters positionally
  as `<MapProps, BimProps, Legend>`.
- Organizations with `pointcloud` in `appContent` need it removed from that column; an
  unrecognized entry is ignored, so this is tidying rather than a break.

## [0.9.0] - 2026-09-08

Consolidates the work previously tagged locally as 0.9.0 through 0.11.1. Those tags were
never pushed and never published, so they were collapsed into this single release.
A minor bump rather than a patch: the removals below are breaking, and under 0.x a caret
range keeps a consumer on 0.8.x until they opt in.

### Added
- **Point clouds render inside the BIM viewer.** A BIM scene can now load Potree point
  clouds alongside its IFC models, through `potree-core` rather than the vendored Potree
  build the standalone viewer uses. New `components/viewers/shared/pointcloud/` holds what
  both viewers need — `pointCloudApi`, `pointCloudLoader`, `pointCloudSource`,
  `pointCloudRegistry`, `pointCloudAppearance`, `pointCloudCentroid`, `pointCloudPivot`,
  `pointCloudPlacement` and `pointCloudTransform`. The BIM side lives in
  `viewers/bim/src/PointClouds/`.
- The BIM sidebar gained a Point Clouds section in the File tab and a point cloud block in
  the Settings tab, with opacity wired to the same setting the standalone viewer reads.
- Measurements and clipping work against point cloud geometry in the BIM viewer.
  `ClippingBoxes`, `clipBox` and `cutStyle` add box clipping next to the existing planes,
  and `scenePicker` picks across model and point cloud content in one pass.
- A control to centre a point cloud's centroid on the scene origin, and pivot handling
  through `pointCloudPivot`.
- **Render modes with sun and shadows.** `renderMode`, `bimLighting`, `solarPosition`,
  `sunPath`, `sunRig`, `SunPath` and `ShadowEnroller` drive a shadowed render mode from a
  real solar position; `createBimWorld` and `modelBounds` centralize world setup.
- **The viewer derives its location from the building it is showing.**
  `BuildingLocationSync`, `buildingLocationParams` and `useViewerLocation` replace an
  assumed location, so the sun path is correct for the model on screen.
- The BIM search bar selects a building rather than only filtering: `searchBuildings`,
  `useSelectBuilding` and `useOptionListKeys`. Switching building clears the spatial
  structure and floorplans belonging to the previous one.
- A pivot indicator (`PivotIndicator`) and camera limits (`CameraLimits`, `cameraLimits`),
  with viewer state pulled out into `bimViewerState`.
- **One placement editor for everything placed in a BIM scene.**
  `viewers/bim/src/Placement/` — `PlacementEditor`, `PlacementEditorHost`,
  `PlacementPanel`, `NumberField`, `placementTarget`, `resolveViewportTarget`,
  `placementCapabilities`, `uniformScale`, `markerActions`, `usePlacementSession`,
  `useViewportContextMenu` and per-kind targets under `targets/` — replaces the separate
  per-kind placement UIs. `PlacementActionsCard` is its entry point in the files manager.
- `DbFile` gained `bimRotation`, `pointCloudTransform` and `scale`.
- **Files carry their own scene membership.** `isVisible` on a file record now decides whether the
  BIM viewer loads it, and the sidebar's Hide/Show entry persists the choice. A building with ten
  models can keep the architectural and structural ones in the scene and leave the eight
  superseded versions listed but unloaded, and the choice survives a reload.
- `useUpdateFile` in the file hooks: `updateFileById(id, patch)` for lists where any row can
  mutate, which `useFile`'s single-id mutation key cannot express.
- `useFileVisibility(buildingId)` — `setVisible` and `setVisibleMany`, which write the
  `filesByBuilding` cache optimistically so the viewer's load effects see the new value in the
  same tick, and roll back if the request fails.
- `shouldPersistVisibility` on `useFileActions`, a predicate so a section can opt its rows in. It
  is off by default: for an IDS run or a BCF import `view` means "apply", not "in the scene".
- `LoadModels.unload(modelId)`, and `load` now returns the model it loaded. Both go through a
  per-model queue, so a load that follows a dispose waits for it instead of seeing the outgoing
  model and skipping its own work.
- `SET_POINT_CLOUD_IDS` on the BIM store, to seed the list from the file records. `TOGGLE_POINT_CLOUD`
  is not idempotent, so a seed that ran twice would have switched every cloud back off.
- `SpatialStructure.forgetModel`, which drops a model's tree but keeps its cached copy, so a model
  switched back on does not rebuild one it already has.
- `dropsAtOrigin` in `Placement/placementCapabilities`, naming the files whose coordinates
  are already surveyed — IFC, fragments and point clouds. Adding one of these no longer arms
  the crosshair: it uploads at the model origin, since asking where to put a survey of the
  building is meaningless.
- IFC conversion reports real progress. `IfcToFragments.loadFromFile` and
  `convertIfcToFragmentsFile` take an optional `onProgress(fraction)`, fed by the importer's
  own `progressCallback`, and the upload toast now counts up instead of sitting silent for
  the minutes a large IFC takes. `onLoadingStateChanged` carries an optional `progress`.
- `useFileUploadHandler` i18n namespace gained `convertingIfc` and `uploadingConverted`.
- Adding an IFC through the add-to-BIM toolbar now converts it to fragments first, as the
  sidebar's Models upload already did. That path previously stored the raw `.ifc`, which
  `LoadModels` cannot read, so the file uploaded but never appeared.

### Changed
- The DXF loader restores depth state after drawing (`restoreDepthState`), and
  `disposeObject3D`, `needsMarker` and `sceneContent` factor out scene bookkeeping that
  was inline in the viewer.
- Point cloud defaults changed for use inside a BIM scene.
- The spatial structure no longer opens on a bare `IFCBUILDING`. A building that carries no name
  and wraps a single child is dropped from the tree, so the level with the real building name
  leads. A named building, or a nameless one grouping several storeys, is kept — that level still
  says something.
- Floorplans and Elevations take an IFC-file filter, shown next to the drawing count, so the levels
  of several files loaded for the same building no longer read as one list. The two views share the
  selection, and the control appears only once more than one file is loaded. New
  `ViewSection.allIfcFiles` i18n key.
- Switching building now clears placed objects and point clouds along with the models. Only the
  fragments were disposed before, so a GLB or DXF from the previous building stayed in the scene,
  and the sidebar's own cleanup could not be relied on because it unmounts with the panel.
- The spatial-tree cache key moved to `v3`, since `v2` entries hold the wrapper level that is now
  dropped.
- A BIM scene loads only the files whose `isVisible` is `true`. `false` and `null` do not load, and
  a building whose models are all switched off now opens as an empty scene rather than showing the
  "no BIM files" upload prompt.
- Hiding a BIM model unloads it rather than making it invisible, so its spatial tree, IFC classes,
  floorplans and elevations go with it, and its bounds stop inflating the shadow framing and camera
  fit. Switching it back on reloads it at its stored placement without reframing the camera.
- A double-click that hits no geometry now places the file at the world origin rather than
  doing nothing. In the add-to-BIM flow the ground-plane fallback still applies whenever
  there is a model to miss; with an empty scene the click carries no position at all.
- Selecting a building now writes `zoom=18` alongside `lat`/`lng` in the URL, so switching
  to the map viewer opens framed on that building instead of at the organization's default
  zoom. The zoom is cleared, like the coordinates, for a building with no location.

### Fixed
- **Restored the whole of 0.8.2, which no release since had carried.** 0.9.0 was tagged on a
  branch that forked before 0.8.2, so the production tile fix was silently reverted: MapTiler
  requests were signed with the shared demo key again, which is honoured on localhost only and
  earns a 403 anywhere else. `maptilerKeyForRequest` and `isLocalhostOrigin` are back, the
  country and building layers skip the request instead of making one that cannot succeed,
  `MapTilerKeyNotice` explains the degraded state on screen, and `SUBDIVISION_LINE_WIDTH` is
  again a single zoom ramp branching on hover in its outputs rather than a nested zoom curve
  MapLibre rejects.
- Removing a 3D model no longer leaks GPU memory. `ModelManager.remove` detached the model and
  freed nothing, and `disposeObject3D` freed geometry and materials but not the textures they
  reference, which `Material.dispose` does not cascade to. Both now free geometry, materials and
  every texture, and the animation mixer's root is uncached. `disposeThreeScene` shares the one
  implementation instead of keeping a second copy.
- The viewport menu now opens on an animated model. `SkinnedMesh.raycast` tests a bounding
  sphere three computes once and never refreshes, so a playing model drifted out of the sphere
  cached at its first pick and every later right-click missed it. `pickSceneObject` recomputes
  the skinned bounds before casting; a still `Mesh` was never affected, which is why only
  animated models were unpickable.
- A BIM file uploaded into an open viewer now appears in the scene without a reload.
  `nextBimViewerState` returns null once `hasLoadedModels` is set, so the one effect that
  loaded models never ran again and a newly uploaded IFC sat in the sidebar unloaded.
  `BimLoadingState` now loads any file the fragments list does not already hold, separately
  from the first-batch state machine so the loading card does not reopen over a scene in use.
- The animation card can be opened for a model added in the current session. `ModelManager`
  gained the `rekey` that `AddDxf` already had, so a model uploaded through add-to-BIM moves
  from its temporary id to its file id. Without it `getClips` looked up the file id, found
  nothing, and the menu offered no animate action until the page was reloaded.

### Removed
- The standalone point cloud alignment tool — `AlignPointCloudTool`,
  `AlignPointCloudPanel`, `PointCloudAlignment`, `useBimPointCloudAlignment` — and
  `Position3DCard`. Both are superseded by the placement editor.

### Migration
- `isVisible` defaults to `false`, and no backfill ships with this release, so a database written
  before it has every file at `false` or `null` and those BIM scenes will open empty. Switch the
  models on from the sidebar, or set the flag for the records that should load:
  `UPDATE "File" SET "isVisible" = true WHERE extension IN ('ifc', 'frag');`
- A consumer reading `file.isVisible` should compare with `=== true`. `!== false` now reads a
  never-set flag as visible, which no longer matches what the viewer loads.

## [0.8.2] - 2026-08-26

### Added
- `MapTilerKeyNotice`, an on-screen notice when the deployment has no MapTiler key of its
  own and the map is running on the shared demo key.

### Fixed
- Map tiles did not appear in production. Subdivision line width is now pinned by a test.

## [0.8.1] - 2026-08-26

### Fixed
- The map falls back to MapTiler's public demo token when no key is configured, instead of
  requesting tiles with an empty key.
- The runtime shim registry listed SDK modules that no longer matched the real SDK surface.

## [0.8.0] - 2026-08-26

### Added
- **A deployment can supply its own MapTiler key.** `mapStyleSpec` builds the satellite and
  streets styles programmatically instead of fetching a hosted style URL, so a deployment
  without a key degrades to Esri World Imagery and Terrarium terrain rather than failing to
  draw. `MAPTILER_PLACEHOLDER_KEY` keeps localhost working with no account.
- Country layer subdivisions respond to the camera and to hover, through
  `useCameraSubdivision` and `useSubdivisionHover`.

### Changed
- The authentication page renders the deployment's logo.

## [0.7.0] - 2026-08-24

### Changed
- **The built-in example plugins now use the same layout as an external one.** `hello-bim`
  and `hello-map` moved their sources under `src/`, matching what `create-cdt-plugin`
  scaffolds, so an author porting a built-in plugin out of core moves files rather than
  rearranging them.
- `@collabdt/plugin-kit` is now a dependency of core, so the host and the kit share one
  copy of the externals list rather than two that can drift.

### Removed
- The scaffolder's `registration` module. Registering a built-in plugin is handled by the
  scaffold step directly.

## [0.6.0] - 2026-08-20

### Added
- `create-cdt-plugin` gained `labels`, `viewers` and `nextSteps`: the CLI names the viewer
  a surface belongs to and prints the remaining manual steps after scaffolding.
- `pluginIcon` resolves a manifest's icon string to a rendered icon in one place, for
  toolbar tools, viewer tabs and data pages alike.

## [0.5.4] - 2026-08-19

### Added
- **A data surface for plugins.** `plugins/sdk/data` and the kit's `types/data.ts` let a
  plugin read platform data through the SDK, reachable as
  `@collabdt/core/plugins-sdk/data`.

## [0.5.3] - 2026-08-17

Includes 0.5.2, which was tagged but not published.

### Added
- **Example plugin bodies for all four surfaces.** `create-cdt-plugin` scaffolds dialog,
  page, tab and layer examples for both built-in and external plugins, not just a toolbar
  tool. `hello-map` and `hello-bim` were rewritten against the same surfaces.
- `plugin-kit` ships `types/ui.ts` so a plugin can type against core's UI components
  without installing Radix.
- An AI-attribution guard: `scripts/check-ai-attribution.mjs`, a `commit-msg` hook and a CI
  workflow reject `Co-Authored-By` trailers naming an AI assistant. `yarn hooks:install`
  points git at `.githooks`.

### Changed
- `Organization.suspended` appeared twice in `dbTypes` — once optional and once required.
  The optional one is gone; the required `suspended: boolean` added in 0.5.1 stands.

## [0.5.1] - 2026-08-14

Includes 0.5.0, which was tagged but not published.

### Added
- **Plugins are a supported boundary, not an internal folder.** `@collabdt/core/plugins-sdk`
  and `@collabdt/core/plugins-sdk/*` are new package exports. Core owns the runtime shim
  registry (`PLUGIN_RUNTIME_SHIMS`, `PLUGIN_EXTERNALS`), so a host generates import maps
  from core rather than from its own copy of the list.
- Two new packages under `packages/`: `@collabdt/plugin-kit`, a tsup preset plus per-surface
  types with a build-time guard that fails a plugin bundling `three`, `react` or any other
  host library; and `create-cdt-plugin`, which scaffolds a built-in or external plugin for
  any of the four surfaces.
- Plugin-owned storage, so a plugin persists its own state without the host knowing its
  shape.

### Changed
- **`extensions` is now `plugins` throughout.** `ExtensionsManager` → `PluginsManager`,
  `ExtensionCard` → `PluginCard`, `useExtensionsData` → `usePluginsData`; the folder
  `components/viewers/extensions/` → `components/viewers/plugins/`; the i18n namespace
  `Extensions` → `PluginsPage`. `useExtensionListings` is gone, replaced by
  `usePluginsData` and `pluginStatus`. There are no deprecated aliases.
- `Organization` gained a required `suspended: boolean`.

### Fixed
- **A GeoJSON dataset mixing geometry types only drew one of them.** The open-data layer
  chose how to draw a whole collection from the geometry type of its first feature, so a
  file starting with a polygon drew its polygons and silently dropped its points. Features
  are grouped by geometry type and each group gets its own source and layer set; layer ids
  are unchanged, and points keep their own source so clustering still works.
- **Organizations could not see their own datasets.** The lookup that mapped a URL path to
  an organization knew only five of them, so any organization added later fell through to a
  shared default; it now takes the instance organization directly. Uploaded datasets were
  also never stamped with their organization, and the visibility filter drops anything with
  none recorded.
- **An organizational dataset would list but not draw.** Uploads store under the owning
  organization while the read side rebuilt the storage path from the organization in the
  web address, so viewing another instance asked storage for a file never written there.
  `useOrganizationalDatasets` keeps the two apart: the owning organization builds the path,
  the address-derived one decides what the viewer may see.
- Enabling an organization database takes effect immediately instead of after a refresh.

### Migration
- `import { ExtensionsManager } from '@collabdt/core/components/viewers/extensions'` →
  `import { PluginsManager } from '@collabdt/core/components/viewers/plugins'`. Rename the
  `Extensions` message namespace to `PluginsPage`.
- Anything constructing an `Organization` must now supply `suspended`.

## [0.4.8] - 2026-08-01

Includes 0.4.6 and 0.4.7, which were tagged but not published.

### Added
- **A classification visibility tab in BIM Layers.** IFC classes can be shown, hidden and
  recoloured individually, from the class list or from the spatial tree.
- IFC spaces are included in generated floorplans.

### Changed
- The viewer sidebar architecture is centralized: tab composition lives in one place rather
  than being rebuilt per viewer.
- Topography and rooms are hidden on load. Both are volumetric and hid everything behind
  them; they can be turned back on from the layers tab.

### Fixed
- The clipping plane is sized to the model instead of an arbitrary constant, and carries
  on-screen instructions.

### Removed
- Dead point cloud code left behind by the viewer rewrite.

## [0.4.5] - 2026-07-31

### Changed
- **`InfoSidebar` is now `ViewerSidebar`.** The component, its folder
  (`components/ui/InfoSidebar/` → `components/ui/ViewerSidebar/`) and its i18n
  namespace were renamed; `InfoSidebarContainer` is replaced by
  `ViewerSidebarShell`. There is no deprecated alias.

  **Migration:** `import { InfoSidebar } from '@collabdt/core/components/ui'` →
  `import { ViewerSidebar } from '@collabdt/core/components/ui'`, and the deep path
  `@collabdt/core/components/ui/InfoSidebar` → `.../ui/ViewerSidebar`. If you
  override messages, rename the `InfoSidebar` namespace (one key,
  `resizeHandleLabel`) to `ViewerSidebar`. The `useSidebar()` API is unchanged —
  `toggleInfoSidebar`, `openInfo` and `setOpenInfo` keep their names.
- **The sidebar tab strip shows icons.** Each tab is an icon with its label
  underneath, and the labels drop out when the strip is too narrow to render them
  legibly. Previously the strip was text-only and truncated to ambiguous stubs
  ("Se..." for both Sensors and Settings) on a narrow or mobile sidebar.
- Tabs are now a proper `role="tablist"` of `<button role="tab">` elements with
  `aria-selected`, `aria-controls`, roving `tabIndex` and Left/Right/Home/End
  keyboard navigation. They were plain `<div onClick>` elements that could not take
  keyboard focus.

### Added
- **`ViewerSidebarShell`** — the shared sidebar chrome (header, tab strip, active
  panel). A viewer now declares `ViewerSidebarTab[]` (`{ id, content, enabled? }`)
  instead of reimplementing the selected-tab wiring; the BIM, map and point cloud
  sidebars each dropped to roughly 25 lines.
- **`ViewerSidebarPanel`** — the shared tab-body wrapper, with `variant`
  (`'sections' | 'scroll'`) and an optional `search` slot that replaces the
  hand-rolled search field each tab carried.
- **`SIDEBAR_TAB_META`** — icon and i18n key per `SidebarTabType`, declared once
  rather than repeated in three `TabSelector` copies.
- **`useCompactTabStrip`** (with pure `isCompactWidth`) — measures the tab strip
  with a `ResizeObserver` so the compaction also applies when the user drags the
  desktop sidebar narrow, which a viewport media query cannot detect.
- Shared `SensorsTab` and `CommunicationTab` under `components/ui/ViewerSidebar/`.
  The BIM and map copies of `SensorsTab` were byte-identical; `CommunicationTab`
  now takes an optional `topics` node, which the BIM viewer uses for BCF topics.

### Fixed
- **Blank sidebar after a viewer switch.** `selectedTab` persists in the Menus
  store, so switching from the map to the point cloud viewer while Sensors or
  Layers was active left every tab guard false — an empty panel with no tab
  highlighted. The shell now falls back to the first available tab and syncs the
  store.
- **Tabs for content the user cannot read are hidden** rather than shown and empty.
  In the map the permission check guarded the panel body, not the tab button, so
  e.g. a user without `read Comment` could select Comments and see nothing.
- Removed a stray `point` class from all three settings panels, and switched them
  from `h-full` to a flex-sized panel so a long settings list scrolls inside the
  sidebar instead of overflowing it.

## [0.4.0] - 2026-07-27

> **⚠️ Upgrading from 0.3.2 or earlier?** The breaking sensor change (readings are
> fetched from `Sensor.url` instead of MinIO) landed in **0.3.3** — follow that
> entry's Migration before upgrading. 0.4.0 itself is additive apart from one
> removed marker style constant, listed under Removed.

### Added
- **Multi-sensor comparison.** `SensorComparisonChart` and `SensorMultiSeriesChart`
  plot several sensors on shared axes, fed by `useSensorSeriesMulti` (polls each
  series independently) and `sensorSeriesRows` (`mergeSeriesRows`,
  `rowsValueDomain`) for aligning them into one row set.
- **Value-driven colours.** `sensorColour` (`colourForValue`, `rampStops`,
  `resolveRamp`, `resolveDomain`, `observedDomain`, `domainTicks`,
  `gradientStopsForYDomain`), `sensorValueColours` (`latestValues`, `readingsKey`)
  and `utils/colourUtils` (`parseHex`, `toHex`, `lerpHex`, `withAlpha`). A sensor's
  current reading now drives its marker halo, its row swatch and the chart gradient.
- **Legends.** `SensorLegend` renders in both the BIM and map viewers over the new
  shared `LegendCard`; `MapLegendHost` was rebuilt on the same card, and its title
  moved from a hardcoded string to the `MapLegend` i18n namespace.
- `sensorScope` (`sensorsInScope`, `tagsForScope`, `tagsOf`) scopes the legend and
  sibling halos to the focused sensor's tags.
- New optional props: `CollapsibleSensorItem` gains `onSelect`, `isFocused`,
  `valueColour` and `valueText`; `Sensor` gains `haloColour` and `onSelect`;
  `utils/markerUtils` gains `sensorRingShadow`.
- `SensorChart` draws a value axis whose gradient follows the ramp domain.
- New `SensorLegend`, `SensorDetail` and `MapLegend` i18n namespaces (~38 strings
  per locale, en/fr/es).

### Removed
- `markerStyleHighlight` from
  `components/viewers/bim/src/tools/AddToBim/src/markerUtils`. Marker highlight is
  now an inline `box-shadow` from `sensorRingShadow` / `commentRingShadow`, because
  a ring colour derived from a live reading cannot be expressed as a Tailwind
  class. `markerStyle` (layout only) stays.

### Deprecated
- `bimToolbarTools()` and `mapToolbarTools()` are renamed to `useBimToolbarTools()`
  and `useMapToolbarTools()`. Both call `useTranslations`, so they are hooks and must
  run during render; the old names still work as deprecated aliases.

### Fixed
- A pending BIM sensor marker now carries an `authorId`, so the author gate in
  `propsMapper` type-checks.
- Clipboard write in the share tool no longer swallows failures in an unreachable
  `try/catch` (the rejection is asynchronous), and the sharing flow continues when
  the clipboard is unavailable.
- `useCaptureScreenshot` resolves `null` instead of hanging forever when base64
  encoding of the captured blob fails.
- Hooks in `Toolbar`, `SettingsButton`, `DatabaseBuildingPopover`, `CompareDialog`
  and `FieldRenderer` now run unconditionally, so switching viewer/property no
  longer shifts hook order.
- Numeric "equals" filters in data tables match again when the cell value is a
  numeric string, and file details "view building" resolves its numeric building id.
- CSV export and data-table search render structured values as JSON instead of
  `[object Object]`.
- `MarkerManager` drag/escape listeners are stable arrow properties, so
  `off`/`removeEventListener` actually detach them.

## [0.3.3] - 2026-07-24

> **⚠️ Breaking change, shipped in a PATCH by mistake** (documented here after the
> fact). **Sensor readings are now fetched from `Sensor.url` directly instead of
> from MinIO.** Sensors whose `url` holds a MinIO object key stop loading until the
> field is updated to a full endpoint URL. See Migration below.

### Added
- `useSensorSeries` + `parseSensorSeries`: fetch a sensor's endpoint, parse CSV or
  OGC SensorThings JSON into epoch-ms points, extract STA metadata (unit, category
  labels), and re-poll at the sensor's `updateFrequency` (floored at 1s), keeping
  the last good series when a poll fails.
- `SensorDetailDialog`: expandable detail view with range presets, a navigator
  brush and zone-aware times, reachable from the sidebar item, the map popup and
  the BIM 3D card. `SensorInput` previews a data URL (format, unit, point count)
  on blur. Sensor surfaces gained the comment-style action row (edit/delete/expand)
  and tag editing.
- Display-timezone support: `utils/timeUtils` gains `detectTimeZone`,
  `formatInZone`, `offsetZoneFromLongitude` and `resolveDefaultTimeZone`
  (browser-first, DST-correct, with a location-derived default); `AppConfig` state
  gains the selected zone; `TimeZoneSelect` ships standalone (not yet wired into
  the detail dialog).
- Shared BIM marker framework under `components/viewers/shared/markers/`
  (`useMarkerLayerBim`, `BimMarkerCluster`, `computeMarkerLookAt`, `types`), now
  backing both comment and sensor markers, plus sensor focus / pending-action state
  in the Menus reducer.
- `sensorRange`: pure time-range bounds, filter and index helpers for the brush.

### Changed
- **`Sensor.url` is now a fetchable endpoint.** Sensor cards, sidebar items, map
  popups and BIM markers all read it directly; the `minioBaseUrl` prop chain behind
  sensor data is gone. Previously the URL was built as
  `${minioBaseUrl}/sensors/${sensor.url}`.
- **Removed the `minioBaseUrl` prop** from `CollapsibleSensorItem`, `MapViewer` and
  `MapLayers`. `Viewer` and `SidebarProvider` still accept it (files and BIM models
  still use it).
- **`SensorChart`'s `sensorData` prop changed shape** from
  `{ time: string; value: number }[]` to `{ t: number; value: number }[]` (epoch
  ms). New optional props: `unit`, `valueLabels`, `timeZone`, `showBrush`,
  `brushStartIndex`, `brushEndIndex`, `onBrushChange`.
- **Store state gained required fields.** `AppConfigState` adds `displayTimeZone`
  and `displayTimeZoneUserSet` (plus `SET_DISPLAY_TIME_ZONE` /
  `SET_DEFAULT_TIME_ZONE` actions); `MenusState` adds `focusedSensorId`,
  `sensorFocusRequestId` and `pendingSensorAction`. Apps using core's `AppProvider`
  need no change; anything constructing those state objects itself (custom
  providers, tests) must add the fields.
- Comment marker internals moved into the shared marker framework. The old modules
  keep default re-export shims, but the `ClusterMember`, `Vec3` and `LookAt` types
  now come from `components/viewers/shared/markers/`, and `computeCommentLookAt` is
  an alias of `computeMarkerLookAt`.
- `formatTimestamp` takes an optional `timeZone` argument (backwards compatible).

### Fixed
- Series are sorted ascending by time; the chart tooltip shows the hovered time
  (dot indicator so the top label renders); duplicate close button removed from the
  map popup.

### Migration
1. For every existing sensor, set `url` to a full, browser-reachable endpoint that
   returns CSV or OGC SensorThings JSON (matching its `dataFormat`) — e.g. an
   `.../Observations?$select=phenomenonTime,result` URL. Keys that used to resolve
   against `minioBaseUrl` no longer work.
2. The endpoint is fetched from the browser, so it must allow CORS from the app
   origin.
3. Drop `minioBaseUrl` where it was passed to `MapViewer`, `MapLayers` or
   `CollapsibleSensorItem`.
4. If you render `SensorChart` yourself, map your series to `{ t, value }` with `t`
   in epoch milliseconds.

## [0.3.2] - 2026-07-23

### Added
- BIM comment markers cluster by screen space (`clusterMarkersByScreenSpace` +
  `BimCommentCluster` bubble), so overlapping pins collapse into a count that fans
  out on hover.
- `CommentActionButtons`: shared reply/edit/delete action row for comment cards.
- `commentCameraUtils` (`computeCommentLookAt`): focusing a comment flies the
  camera to a framing that keeps the marker in view.
- Resizable info sidebar via the `useResizableSidebarWidth` hook, with a labelled
  drag handle (new `InfoSidebar` i18n namespace) and comment placement hints
  (`clickPlusHint`, `doubleClickZoom`).

### Changed
- ESLint tier 4 rules (typed correctness + React component-library guards) plus a
  `no-console` cleanup pass across core.

## [0.3.1] - 2026-07-21

### Added
- `eslint.config.mjs`: the balanced all-warn base config plus tier 1 (zero-dep
  bug-catchers) and tier 3 (import hygiene, `import/no-cycle`, `import/order`).
  Landing them included a repo-wide autofix sweep, which is why the diff is large
  and almost entirely import ordering.

### Fixed
- Mobile layout: sidebar and `Select` sizing, a rebuilt
  `NonDatabaseBuildingPopover`, and `globals.css` viewport rules.

## [0.3.0] - 2026-07-16

> **⚠️ Breaking change** (released as a 0.x MINOR bump per our versioning policy —
> 0.x minors may break; no `major`/`!` marker). `@collabdt/core` now owns and ships
> its own i18n messages. **Consuming apps must upgrade in lockstep:** an app that
> imports `@collabdt/core/messages` will not resolve against core < 0.3.0, and an
> app still on 0.2.x will not pick up core's strings. See Migration below.

### Added
- i18n message catalogs shipped with the package: `src/core/i18n/messages/{en,fr,es}.json`,
  exported as `coreMessages` through a new `@collabdt/core/messages` entry point.
- Build copies JSON message assets into `dist` so the catalogs ship with the package.

### Changed
- Every translation namespace used by core components (115 in `en.json`) now lives in
  core instead of the consuming app — `AppSidebar`, `Signin`, `Datasets`,
  `mapToolbarTools`, and the rest. Contributors can add a core component and its
  en/fr/es strings in a single PR, with nothing to coordinate downstream.

### Fixed
- `resetPassword` was missing its French and Spanish translations (English fallback
  only); now translated with full en/fr/es key parity.

### Migration
Merge core messages under your app catalog (app wins on key conflicts; core English
backfills any locale a key hasn't been translated into):

```ts
import { coreMessages } from '@collabdt/core/messages'
import deepmerge from 'deepmerge'

// in your next-intl getRequestConfig:
messages: deepmerge.all([
  coreMessages.en,
  coreMessages[locale] ?? {},
  appMessages, // your app-only strings, if any
])
```

## Template for new entries
0.1.1 - 2019-09-03
Added

    New features go here in a bullet list

Changed

    Changes to existing functionality go here in a bullet list

Deprecated

    Mark features soon-to-be removed in a bullet list

Removed

    Features that have been removed in a bullet list

Fixed

    Bug fixes in a bullet list

Security

    Changes/fixes related to security vulnerabilities in a bullet list

0.1.0 - 2019-09-02
Added

    Initial add of the thing

