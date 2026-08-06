
Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

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

