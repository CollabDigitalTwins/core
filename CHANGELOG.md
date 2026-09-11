
# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]
### Security
- **`maplibre-gl` is now required at `^6.9.0`, which closes CVE-2026-85061 (CVSS 9.6).**
  `DOM.sanitize()` in every version up to and including 6.4.0 walked the live `NamedNodeMap`
  returned by `elem.attributes` while removing entries from it, so the indexes shifted and an
  adjacent dangerous attribute was skipped. Two consecutive ones let an `onload` or `ontoggle`
  survive sanitization and run when the attribution control wrote the string into `innerHTML`.
  Attribution text comes from the style document, so any deployment that renders a third-party
  or user-supplied style was one map load away from script execution in the viewer's session.
  Fixed upstream in 6.4.1.

### Added
- **Overlapping map features now open one popup with a switcher instead of only the topmost.**
  Clicking where several interactive layers overlap collects every hit into a `popupStack`
  on the map store (`SET_POPUP_STACK`, `SET_POPUP_INDEX`) and renders them through a single
  `MapPopupStack`, with a `‹ 2 of 5 · Building ›` header when there is more than one. Entries
  are ordered by `MapLayerClickPriority`, deduplicated by id and capped at 10 per click.
  Clusters contribute one entry listing their contents with a zoom-to-expand button. New
  `MapPopupStack` message namespace in `en`, `es` and `fr`.
- `PopupEntry` and `PopupStack` in `…/types/map`, the descriptor a layer returns from its
  click resolver.
- An optional `header` slot on `Sensor`, `Comment` and `MapFeaturePopoverMenu`, so the popup
  switcher renders inside the body's own card. The slot also carries the popup's single close
  button: a body that receives a `header` hides its own, so every map popup closes the same way.
- **A 3D-buildings toggle in the map settings panel.** New `show3dBuildings` on the map store
  (default `true`) with an `UPDATE_SHOW_3D_BUILDINGS` action, a `BuildingVisibility` control
  under Map Style, and a `MapCustomization.buildings3d` message in `en`, `es` and `fr`.
  Switching it off hides the layer, which also takes it out of hit-testing.
- `TERRAIN_SPEC` from `…/map/utils/mapStyleSpec` and `SUBDIVISION_LINE_OPACITY` from
  `…/map/src/MapLayers/src/CountryLayer`, so a consumer overriding either can reuse the same values.
- `writeModelMatrix` in `@collabdt/core/core/components/viewers/map/utils/modelMatrix` builds the
  model-to-mercator matrix for a three.js custom layer, replacing the
  `map.transform.getMatrixForModel` that maplibre 6 removed. It writes into a caller-owned
  `Matrix4` so a render loop allocates nothing.

### Changed
- **`SiteContextMenu` is renamed `SiteMenu`**, along with its file, its props type and its
  i18n namespace. It is anchored by the map popup rather than the cursor, so the
  "context menu" name was misleading; its `x` / `y` props are gone with the fixed
  positioning they drove. See Migration.
- **`MapClickManager.register` now takes a `PopupResolver` that returns `PopupEntry[]`, not a
  side-effecting `ClickCallback`.** Clicks collect entries from every layer that was hit rather
  than stopping at the highest-priority one, so `MapLayerClickPriority` orders the stack instead
  of deciding which single layer wins. `registerLegacy` keeps the old callback contract for
  handlers that own their own UI, and `MapLayerClickPriority.ActiveTool` is still exclusive:
  a click while a tool is active opens nothing. See Migration.
- maplibre 6 is ESM-only and no longer inlines its tile-parsing worker the way 5 did; the
  worker now ships as a separate `maplibre-gl-worker.mjs` chunk that has to be resolvable at
  runtime. See Migration.
- **`maplibre-gl` moves from `^5.0.0` to `^6.9.0` in `peerDependencies`.** A consumer has to
  upgrade in lockstep; the new range cannot be satisfied by any release still carrying the
  advisory above.
- **`react-map-gl` moves from `^8.0.0` to `^8.1.3` in `peerDependencies`.** maplibre 6 removed
  the internal `map.transform` property — `Map` now composes a `Camera` instead of extending it —
  and react-map-gl read it on every camera event. Versions below 8.1.3 therefore throw
  `Cannot read properties of undefined (reading 'center')` on any pan, zoom or `flyTo`; 8.1.3
  reads the public getters instead.
- **The country-subdivision border fades out above zoom 9 and stops drawing at 10.** The
  subdivision fill is unchanged and still hit-tests at every zoom, so camera tracking and hover
  keep resolving `countrySubdivision` with no border on screen.
- Map-level pointer listeners use `mouseout`. In maplibre 6 `mouseenter` and `mouseleave` are
  layer-scoped events and require a layer id, so they never fired when bound to the map itself.

### Fixed
- **Streets no longer draws buildings twice.** Basemaps such as maptiler `streets-v2` extrude
  the `building` source-layer themselves, so the basemap's own extrusion is dropped before
  `maptiler-3d-buildings` is added and only ours renders.
- **Terrain is removed while the globe projection is active.** The globe has no fog matrix, so
  maplibre logged `calculateFogMatrix is not supported on globe projection` and drew a terrain
  pass that produced nothing. Terrain is restored when the map returns to mercator.
- `MapHoverManager.destroy()` removed a `mouseenter` listener it had never registered, leaving
  its `mousemove` handler bound to the map for the life of the page.

### Removed
- The `global-borders-region` layer. Its `admin_level` 3–4 lines drew a second province border
  on top of the subdivision outline; the subdivision layer is the org-coloured, hover-aware one,
  and `global-borders-country` still draws country outlines.

### Migration
- Rename any import of `SiteContextMenu` to `SiteMenu` (the file moves from
  `SiteContextMenu.tsx` to `SiteMenu.tsx`, and `SiteContextMenuProps` becomes `SiteMenuProps`).
  Drop the `x` / `y` props. A message catalog that overrides the `SiteContextMenu` namespace
  must rename that key to `SiteMenu`, or its overrides fall back to the bundled strings.
- **A custom map layer that called `mapClickManager.register` must return `PopupEntry[]`
  instead of opening its own `<Popup>`.** Build the descriptor in the layer so `render` keeps
  that layer's state and hooks:
  ```ts
  mapClickManager.register(LAYER_ID, MapLayerClickPriority.BuildingLayersClickPriority,
    (e, hits) => hits.map(feature => ({
      id: `${LAYER_ID}:${feature.id}`,
      layerId: LAYER_ID,
      priority: MapLayerClickPriority.BuildingLayersClickPriority,
      title: feature.properties.name ?? 'Feature',
      coordinates: [e.lngLat.lng, e.lngLat.lat],
      render: header => <MyPopupBody header={header} feature={feature} />,
    })))
  ```
  `render` receives the stack's switcher bar and must place it **inside** its own card, so
  per-card chrome (the sensor ring, a coloured border) wraps the bar too. `Sensor`, `Comment`
  and `MapFeaturePopoverMenu` take it as a new optional `header` prop.
  `id` is the dedup key, so a layer drawn as several maplibre layers (fill + outline) must
  produce the same id for the same feature. A body that reads live data should render a
  component rather than capture values in the closure, which is built once per click.
  Registrations that open their own UI and consume the click — an active tool, for example —
  move to `registerLegacy` with no other change.
- Upgrade `maplibre-gl` to `^6.9.0` and regenerate your lockfile in the same commit. Bumping
  `package.json` alone leaves the vulnerable version resolved and the advisory open.
- Upgrade `react-map-gl` to `^8.1.3` at the same time. The two are not independent: maplibre 6
  with react-map-gl 8.1.1 or earlier crashes on the first camera movement.
- **Call `setWorkerUrl()` once, at application startup.** maplibre 6 loads tile parsing from a
  separate worker chunk, and under a bundler `import.meta.url` does not resolve into the module
  graph, so its own `defaultWorkerUrl()` returns an empty string and no tiles load. The URL is
  bundler-specific, so this package does not guess it. On Next.js, copy both
  `maplibre-gl-worker.mjs` and its sibling `maplibre-gl-shared.mjs` out of `maplibre-gl/dist`
  into `public/maplibre/` from a pre-build script, then point at the served path:
  ```ts
  import { setWorkerUrl } from 'maplibre-gl'
  setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
  ```
  The worker imports that sibling on its first line, and Turbopack does not emit it beside a
  hashed worker asset, so the `new URL('maplibre-gl/dist/maplibre-gl-worker.mjs',
  import.meta.url)` form that works under plain webpack fails there. Vite instead wants
  `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'`.
- maplibre 6 drops its default export. `import maplibregl from 'maplibre-gl'` becomes
  `import * as maplibregl from 'maplibre-gl'`, and the same for `import type`.
- `map.transform.getMatrixForModel` is gone. A custom layer that builds its own model matrix
  should call `writeModelMatrix(out, lngLat, altitude)` instead.
- A map-level `map.on('mouseleave', fn)` or `map.on('mouseenter', fn)` must become
  `map.on('mouseout', fn)` / `map.on('mousemove', fn)`, or pass a layer id to keep the old event.

## [0.10.0] - 2026-09-10
### Added
- **The File tab's sections can be reordered by press-and-hold.** Holding a section header
  (icon + title) for 400ms lifts it; dragging moves it between the other sections and
  releasing commits the new order. `Alt+ArrowUp`/`Alt+ArrowDown` on a focused header does the
  same from the keyboard, and `Escape` abandons a drag. The order lives in `MenusState` as
  `fileTabSectionOrder`, so it survives tab switches for the session but not a reload.
  New `SET_FILE_TAB_SECTION_ORDER` action; a payload that is not a permutation of the four
  sections is ignored rather than dropping a section from the tab.
- `CollapsibleSection` takes `dragHandleProps` and `isReordering`, and its header is now a
  focusable `role="button"` that toggles on Enter/Space.

### Changed
- **Empty File tab sections collapse and sink to the bottom.** A section with no items starts
  closed and sorts below the populated ones, keeping its relative order; opening one keeps it
  open, and it returns to its own slot once it holds a file.
- The File tab's default section order is now BIM, Point clouds, Models, Files.

### Fixed
- **A `.las`, `.laz` or `.e57` added through the BIM viewer's Add to BIM toolbar was never
  recognised as a point cloud.** The tool had its own upload path that wrote every file as
  `type: 'bim-file'` through the generic presigned route, so a `las`/`laz` got no point cloud
  record and no conversion job, and its row was filed under Models. `e57` was in neither the
  point-cloud nor the surveyed extension set, so it was offered click-to-place instead of
  dropping at origin. The same blanket `type: 'bim-file'` also filed placed PDFs and images
  under Models. `useFilePlacement` now routes every upload through the same `useBimFileIntake`
  hook the rest of the BIM viewer uses, and its own `toast.loading` spinner is gone in favour of
  the shared upload progress bar.
- File classification reads the extension before the stored `type`, so rows the old path
  mis-stamped re-file themselves correctly with no backfill.
- **A point cloud created through `/api/point-cloud` never appeared in the BIM viewer.**
  Classification was by extension alone, and the converter records no extension.
  `isPointCloudFile` now accepts either signal — `type === 'point-cloud-file'` or a cloud
  extension — matching what `BuildingsTools` already did, so existing rows need no backfill.
  The BIM branch of the File tab likewise accepts `type === 'bim-file'` alongside ifc/frag.
  Separately, the source format now travels from the picker through the proxy to the
  converter, which stores it on the record and in the object key, so an E57 keeps its
  extension for the worker to read.

- **A plugin tool that sets `stayActive` now keeps working after its panel is closed.**
  The plugin host put a plugin's whole component inside the toolbar dropdown, and a
  dropdown throws its contents away when it closes — so the plugin's cleanup ran and
  whatever it had added to the map was removed. Core's own stay-active tools were never
  affected, because they keep their work in the component the toolbar mounts and put only
  menu items inside the dropdown. A stay-active plugin now gets a panel the host owns:
  the plugin stays mounted and only the panel around it is hidden while closed.
  `ToolbarSubmenu` is unchanged, so every other tool behaves exactly as before, and
  plugin tools that do not set `stayActive` keep the existing dropdown. No plugin needs
  editing to pick this up.

### Added
- **Point clouds are uploaded and converted from the BIM viewer's File tab.** The Point
  Clouds section gained an upload button, an upload progress bar and a conversion progress
  bar, plus per-row recovery for the two ways the pipeline fails: re-run conversion when the
  object uploaded but never converted, and re-upload when the upload itself died.
  New `viewers/shared/pointcloud/pointCloudConversion` holds `createPointCloud`,
  `startConversion` and `watchConversion`; `viewers/bim/src/PointClouds/usePointCloudIntake`
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
  namespaces, plus `FileItemComponent.addModelTitle` and `ViewerSidebar.resizeSectionsLabel`,
  for en, es and fr.
- **`FileType`**, the file taxonomy — `bim-file`, `point-cloud-file`, `3d-file`, `cad-file`,
  `media-file`, `document-file`, `file` — with `typeOfFile`, `typeOfRecord`,
  `EXTENSIONS_FOR_TYPE`, `ACCEPT_FOR_TYPE` and `SECTION_FOR_TYPE` in
  `ui/FilesManager/src/fileType`. `3d-file` is exactly what `ModelManager` can load — `glb`,
  `gltf`, `obj`, `fbx`, `dae` — and every 3D check in the BIM viewer now derives from it, so
  the picker cannot advertise a format the loader refuses. `3ds`, `ply` and `stl` are not in
  it and classify as plain files.
- **COPC** (`.copc.laz`) is accepted for upload. A COPC file is a LAZ 1.4 file, so
  PotreeConverter reads it directly; `normalizePointCloudFormat` tells the converter `laz`.
- **One shared upload progress bar** for every file kind and both phases — `converting` and
  `uploading` — rendered in both the toast and the destination sidebar section:
  `UploadProgressBar`, the `uploadProgress` task store, and `useBimFileIntake` as the single
  router.
- `performUploadFile` takes an optional `onProgress`, switching the PUT to XHR so any caller can
  report progress.
- A **BIM** section at the top of the BIM File tab for ifc/frag.
- `SceneObjectRegistry.resetForBuilding(buildingId)`, an idempotent per-building scene reset:
  the first call only records the id, only a later, genuine change clears the scene, and a
  `null`/`undefined` building is a no-op. Every sidebar section now drives the reset without
  the second wiping what the first seeded.
- `useResizableSections` in `ui/ViewerSidebar`, the draggable-separator layout for N
  collapsible sections, extracted from the Layers tab so the File tab could use it too.

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
- The File tab is four **resizable** sections — BIM (`Box`, ifc/frag), Models (`FileAxis3d`,
  3D geometry), Point Clouds (`Grip`), Files (`FileText`, CAD/media/documents), separated by a
  draggable divider (`useResizableSections`) instead of three fixed ones. 3D geometry moved
  out of Files.
- `Progress` is themed (`bg-muted` track, `bg-primary` indicator) rather than a white indicator
  on a grey track, and accepts `value={null}` for an indeterminate bar.
- `capabilitiesForFile` and `dropsAtOrigin` are derived from `FileType` and no longer keep their
  own extension lists.
- `getFileIcon` resolves by `FileType` before falling back to the extension, so a converted
  point cloud — whose record carries no extension — keeps its point-cloud icon instead of a
  generic one; `e57` and `copc` are recognised extensions in the fallback too.
- A point cloud that finishes converting is marked visible automatically, instead of staying
  in the scene list unseen until toggled on by hand.
- The Add-file card in the BIM viewer closes as soon as a picked file needs no placement
  (a point cloud, IFC or fragments file), instead of staying open with nothing left to do.

### Removed
- `Upload.finalising`, and the `finalising` member of `UploadPhase`. The phase was set and the
  task ended in the same tick, so it never rendered.
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
- `LayersTab.resizeSectionsLabel` moved to `ViewerSidebar.resizeSectionsLabel`, since two tabs
  now share the separator. A consumer overriding that key must move it.
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
- `usePointCloudUpload` is now `usePointCloudIntake` and no longer returns `state`; progress is
  read from the shared store with `useUploadTasks('pointClouds')`.
  ```ts
  const { upload, convert, busy } = usePointCloudIntake({ apiBase, buildingId, existingNames })
  const tasks = useUploadTasks('pointClouds')
  ```
- `useFilePlacement` gained a trailing `onDone` callback, called once a file is placed or
  needs no placement at all — pass a handler that closes your Add-file card. Its sixth
  argument is now the object returned by `useBimFileIntake`, not `uploadFile`.
- Mount `<UploadProgressToasts />` once inside the viewer tree for progress toasts to appear.

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

