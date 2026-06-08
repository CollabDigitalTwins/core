# Unit Testing Strategy — @collabdt/core

This document explains the rationale behind the unit tests in the `@collabdt/core` package: what patterns are tested, why each file was chosen, and why certain files are intentionally left untested.

Tests run on **Vitest** (`yarn test:unit`). `*.test.ts` files run in the `node` environment (pure logic); `*.test.tsx` component/hook tests opt into jsdom with a per-file `// @vitest-environment jsdom` pragma and use Testing Library. Test files are **co-located** next to the source they cover (e.g. `roles.test.ts` sits beside `roles.ts`).

> The HTTP adapter pattern (`createHttpAdapter`) is **not** in this package — it knows about app-specific route URLs and lives in the consuming app (cdt-na: `src/hooks/__tests__/httpAdapter.test.ts`). Its reference test is documented in that app's `TESTING.md`.

---

## Philosophy: Test Distinct Behavior, Not Every File

The goal is not 100% line coverage — it is to have at least one test for every **distinct behavior pattern**. A "distinct pattern" means code you would have to reason about differently: different branching, different side effects, different derivations. Once a pattern is proven, structurally identical code that follows the same pattern does not get its own test.

This is the same "buildings is the reference implementation" rule used on the backend: prove the pattern once, skip the siblings.

**One important caveat for the frontend:** component render tests are more fragile than logic tests. They couple to copy, DOM structure, and external-library APIs, so each one carries ongoing maintenance cost. We test where behavior actually branches and skip where the code is pure rendering or pure forwarding.

---

## Frontend Pattern Categories

Six patterns cover the package. Each is proven with at least one reference test; structurally identical sibling code is intentionally skipped.

### 1. Pure utility functions

Plain TypeScript functions (parsers, formatters, geometry helpers) with deterministic inputs and outputs. Highest ROI — no mocks, fast to run, breaks only when behavior actually changes. The map dataset parsers (`geojsonFile`, `arcgisFetch`, `urlSources`), the BIM `normalizeElevation` helper, the comment builder, and the download-filename helpers all live here.

### 2. Pure React hooks (derivations)

Hooks that compute a return value from context/props with no side effects. Tested with `renderHook`; mock the contexts/i18n the hook reads. `useFriendlyIfcClassName` and `useBuildingName` are the reference implementations.

### 3. Side-effectful hooks (data + DOM)

Hooks that fetch, upload, mutate SWR cache, or touch the DOM. Mock `fetch`, mock the SWR `mutate`, mock any low-level helper the hook delegates to. `useFileUploadWithProgress` is the reference implementation (happy path + each error branch); `useFileActions` covers the state-machine pattern (delete dialog, action dispatch, visibility toggle).

### 4. Form components with client-side logic

Components that do validation, multi-step flows, or error-state branching beyond pure rendering. Tested with `@testing-library/react`:
- **`Signin`** — reference for auth forms. Validates form submission calls `signIn('credentials', ...)`, the `invalid_credentials` error path renders the right message, and rendering survives the MFA branch.
- **`Signup`** — adds the password-confirmation match rule.
- **`ForgotPassword`** — adds the password-only reset flow.
- **`CollapsibleCommentItem`** — adds ownership-conditional rendering (edit/delete buttons only for the comment's author) and action dispatch.

### 5. Store reducers

Pure `(state, action) => state` functions with branching (dedupe, filter, cascade). `Menus/reducer` is the reference implementation; trivial one-liner setter reducers are skipped.

### 6. Plugin-host / registry

The plugin SDK and host: manifest validation, capability-gated registration, load/unload lifecycle, and the registry's per-extension-point storage. `MapLegendHost` is the reference for a component that subscribes to the registry and conditionally renders.

---

## Maintenance trade-off for component tests

A pure-function test like `expect(parseGeoJSON(...)).toEqual(...)` breaks only when behavior changes. A component test like `expect(screen.getByText('Sign In')).toBeInTheDocument()` is coupled to:

- **Copy and i18n** — a translation update or string rewording can break the assertion even though nothing functionally changed.
- **Mock boilerplate** — every component test re-mocks `next-intl`, `next-auth/react`, `next/navigation`, the `'../ui'` barrel, and the relevant store contexts. When any of those libraries change API, the mocks update too.
- **DOM restructuring** — wrapping a button in a new div to fix a CSS bug can break `getByRole`/`getByTestId` lookups.
- **Dependency bumps** — Radix, MapLibre, RTL itself occasionally shift their DOM output.

Expect roughly **30–60% of component test files to need touch-ups annually** from redesigns, copy refreshes, and dep bumps — even when no behavior actually broke. This is the price of catching wiring regressions and accidental field removals. Resist adding render tests for components that have no client-side branching (Radix wrappers, settings panels that just render a form); pure-rendering bugs are visible immediately and don't justify the maintenance drag.

---

## Test Inventory

### Pure Utilities

- `src/core/components/viewers/map/datasets/src/geojsonFile.test.ts` — `parseGeoJSON` input variants (FeatureCollection / Feature / Geometry / invalid), `summarizeFeatures` bbox / property-key / geometry-type computation, Infinity edge case for empty bbox, 3D-coordinate z-stripping.
- `src/core/components/viewers/map/datasets/src/arcgisFetch.test.ts` — `fetchWithTimeout` abort signal chaining, `fetchArcGISLayerFeatures` pagination (transfer-limit + short-page + maxPages stop conditions).
- `src/core/components/viewers/map/datasets/src/__tests__/urlSources.test.ts` *(pre-existing)* — `detectSourceType`, `extractWmsLayers`, `nameFromUrl`, `buildWmsTileUrl`.
- `src/core/components/viewers/map/datasets/src/minioDatasets.test.ts` — `/api/files` filtering by type+tag, MinIO URL construction, name fallback, `geometryType` → layerType mapping, `getFeatures` caching.
- `src/core/components/viewers/map/datasets/utils.test.ts` — `formatName` slug→title, `formatDate` ISO formatting + invalid fallback, `stripHtml`.
- `src/core/components/ui/Comments/commentUtils.test.ts` — `buildComment` shape with injected `now`.
- `src/core/components/ui/downloadUtils.test.ts` — anchor creation + click + cleanup, timestamp prefix, custom extension swap.
- `src/core/components/viewers/bim/src/FloorplanTool/src/utils.test.ts` — `normalizeElevation` mm→m conversion + coord-adjusted branch, `getStoreyItemIds` error handling.
- `src/core/components/viewers/bim/src/lib/safeRun.test.ts` — sync + async error swallowing with labeled log.
- `src/core/components/viewers/map/utils/stringToColour.test.ts` — deterministic hash→palette, `min`/`max` variants lighten/darken, `layerColorByName` wraps the four variants.
- `src/core/components/viewers/map/utils/validateBounds.test.ts` — `resolveBounds` accepts flat / nested / JSON-string inputs; falls back on Infinity / NaN / wrong shape / malformed JSON / null.
- `src/core/components/viewers/map/utils/extractCoordinates.test.ts` — extracts from `[lng,lat]` array and `{lng,lat}` / `{lon,lat}` / `{x,y}` object forms; returns null on NaN, non-number, or missing-coordinates geometry.
- `src/core/utils/roles.test.ts` — `getNormalizedRoleNames` lowercase+trim+filter; `isAdminUser` true for `Admin` or `admin` role, false otherwise. *(A case-sensitivity bug in `isAdminUser` was found and fixed by lowercasing `RoleNames.admin` in the comparison.)*

### Store

- `src/core/store/Menus/reducer.test.ts` — reference impl for store reducers. `SET_VIEWER` / `SHOW_COMMENTS_IN_VIEWER` dedupe / `HIDE_COMMENTS_IN_VIEWER` filter / `HIDE_ALL_SENSORS_IN_VIEWER` cascade to `visibleSensorTypes` / `TOGGLE_SENSOR_TYPE_VISIBILITY` add+remove+force=idempotent / scalar setters / sensor-tag visibility / unknown action returns state by identity.

### Plugin SDK & Host

- `src/core/plugins/host/host.test.ts` — `PluginHost.loadPlugin` activates and sets status, errors are caught and status flips to `errored`, capability enforcement via `context.register`, `unloadPlugin` calls `deactivate` and deregisters from the registry, `listPlugins` enumerates loaded entries, config is forwarded into context.
- `src/core/plugins/host/context.test.ts` — `createPluginContext` exposes `pluginId`/`config`/`register`; `register` is gated on declared capabilities and merges `pluginId` into entries.
- `src/core/plugins/host/registry.test.ts` — `PluginRegistry.register` stores entries by extension point; `getAll` returns the list; `deregisterAll` removes a plugin's entries from every extension point.
- `src/core/plugins/sdk/types.test.ts` — `validateManifest` accepts a valid manifest; rejects missing slug, missing name, missing version, missing capabilities, and unknown capability strings.

### Hooks

- `src/core/components/viewers/bim/src/lib/useFriendlyIfcClassName.test.tsx` — IFC class verbatim, non-IFC i18n lookup, unknown-key fallback.
- `src/core/components/viewers/bim/src/lib/useBuildingName.test.tsx` — multi-model → single-model → ID fallback chain + extension stripping.
- `src/core/components/ui/FilesManager/src/useFileUploadWithProgress.test.tsx` — reference impl for side-effectful hooks. Happy path + presigned-URL fail + metadata-POST fail. `handleAddFile` injects a hidden `<input type="file">` and clicks it.
- `src/core/components/ui/FilesManager/src/useFileActions.test.tsx` — delete-with-confirmation state machine, view-visibility toggle, ghost toggle, download fallback to `downloadFile`, info-dispatch when no custom handler.

### Components

- `src/core/components/authentication/Signin.test.tsx` — reference impl for auth forms. Form rendering, `signIn('credentials', …)` arg shape, invalid-credentials error rendering, MFA branch survives.
- `src/core/components/authentication/Signup.test.tsx` — short-password and password-mismatch validation surfaced after submit.
- `src/core/components/authentication/ForgotPassword.test.tsx` — password-only reset flow, length + mismatch validation.
- `src/core/components/authentication/SigninEmail.test.tsx` — smoke test only. `SigninEmail` is an email-template component (like `VerifyEmail`), not a form — the test verifies the URL is rendered as a real `<a href>` and the heading/logo are present. No client-side logic exists beyond static rendering.
- `src/core/components/settings/src/ChangePassword.test.tsx` — two-step flow: verify current password (`useVerifyPassword` mocked) → enter new password. Tests the `isEditing=false` null-render branch, the 12-char minimum for "next", advancement on `verifyPassword: true`, the strong-password regex, the password-match check, and the final `changePassword(current, new)` call.
- `src/core/components/viewers/map/datasets/AddPortalDialog.test.tsx` — "Name is required" error, empty-optional stripping before submission, `onOpenChange(false)` on success, error surfaced from `useCreateOpenDataPortal` rejection, Cancel button.
- `src/core/components/viewers/map/datasets/Filters.test.tsx` — filter count badge, top-level vs nested view switching, `getUniqueValues` per category (including the source-uses-portal-name fallback), `onFiltersChange` field mapping, permission-disabled state.
- `src/core/components/ui/Comments/CollapsibleCommentItem.test.tsx` — comment text + author render, edited badge, reply count, ownership-conditional edit/delete buttons, `onAction('delete', id)` dispatch.
- `src/core/components/ui/Comments/CommentsSection.test.tsx` — visible-comments filter (current viewer + buildingId), case-insensitive search filter, delete-action dispatch via `useComment.deleteComment`, "Add Comment" tool dispatch per viewer, visibility toggle direction.
- `src/core/components/viewers/map/legends/MapLegendHost.test.tsx` *(pre-existing)* — plugin-registry subscription pattern.

---

## Intentionally Untested (Frontend)

### Radix UI primitive wrappers

The ~50 files under `src/core/components/ui/` named after Radix primitives (`Button`, `Dialog`, `Checkbox`, `Select`, `DropdownMenu`, etc.) are pure forwarders to Radix with styling. They have no branching, no client-side state beyond what Radix manages, and no logic that can silently produce a wrong result. Bugs are visible the moment the component renders. Testing them duplicates Radix's own test suite.

### All BIM viewer Three.js / OBC classes

The following files instantiate `OBC.Components`, manipulate `THREE.Scene` / `THREE.Camera` / `THREE.WebGLRenderer`, and call IFC model APIs:

- `src/core/components/viewers/bim/src/SpatialStructure.ts`
- `src/core/components/viewers/bim/src/ViewportGizmo.ts`
- `src/core/components/viewers/bim/src/LoadModels.ts`
- `src/core/components/viewers/bim/src/ModelManager/index.ts`
- `src/core/components/viewers/bim/src/FloorplanTool/src/FloorplanRenderer.ts`
- `src/core/components/viewers/bim/src/FloorplanTool/src/StoreyProjector.ts`
- `src/core/components/viewers/bim/src/lib/CameraController.ts`
- `src/core/components/viewers/bim/src/lib/ClipController.ts`
- `src/core/components/viewers/bim/src/lib/GridController.ts`
- `src/core/components/viewers/bim/src/lib/ChromeController.ts`
- `src/core/components/viewers/bim/src/lib/CategoryHighlighter.ts`
- `src/core/components/viewers/bim/src/lib/ViewModeCoordinator.ts`
- `src/core/components/viewers/bim/src/lib/drawingLayers.ts`
- `src/core/components/viewers/bim/src/lib/drawingProjection.ts`
- `src/core/components/viewers/bim/src/lib/exportDrawingToDxf.ts`
- `src/core/components/viewers/bim/src/lib/viewSection.ts`

**Reason:** unit-testing them would require mocking the entire OBC component tree, a Three.js renderer, and the IFC model query API. The mocks would be larger than the code under test and would break on every OBC/Three.js upgrade. Coverage for this code comes from manual QA in the running viewer.

**Mitigation for future contributors:** where pure helper logic is embedded in these classes (e.g., the spatial-tree transform inside `SpatialStructure.ts`, the rotation math in `exportDrawingToDxf.ts`), extract it into a sibling file and add a pure-utility test — the same approach as `FloorplanTool/src/utils.ts → normalizeElevation`, which is unit-tested even though the surrounding `FloorplanRenderer` is not.

### Pointcloud viewer

`src/core/components/viewers/pointcloud/` — Potree-based 3D rendering. Same rationale as the BIM viewer (heavy renderer dependencies, no isolated logic worth unit-testing).

### Heavy "shell" components

`AuthPage.tsx`, the top-level layout components, and the global navigation chrome are skipped because they orchestrate `next/dynamic` imports, MapLibre, and other heavy children. They contain no branching beyond what their child components already provide.

### Sibling auth/CRUD components

`VerifyEmail.tsx` and the various settings panels (other than `ChangePassword`, which is now tested) follow the same form-validation pattern proven by `Signin` / `Signup` / `ForgotPassword`. Distinct rules within them get added to the existing reference test if a real bug surfaces — not preemptively.

### i18n message files

`src/i18n/messages/*.json` are data, not code. Translation correctness is verified by the i18n tooling, not Vitest.

### Charting/sensor display

Components under `src/core/components/ui/Sensors/` render Recharts/charting libraries. They have no client-side logic — any data transforms get extracted to a pure utility and tested under that category instead.

### Server-only / window-gated modules

`src/core/utils/memcache.ts` short-circuits its exported functions based on the runtime (`typeof window`), and the real path drives a dynamic `import('memjs')` connection lifecycle. Testing the cache-aside pattern (`withMemcache`, `setMemcache`, `getMemcache`) would require mocking `memjs` and reproducing the connection lifecycle — significantly more setup than the value of asserting "the library was called with these args". Cache hits/misses are observable in production logs (`console.log('Memcache HIT/MISS: ...')`) and any cache bug surfaces as obvious slowdown or stale data, not silent corruption.

### Comments leaf components

- `src/core/components/ui/Comments/Comment.tsx` — pure leaf renderer for a single comment row; conditional collapse state lives in `CollapsibleCommentItem` (already tested).
- `src/core/components/ui/Comments/CommentInput.tsx` — heavy MapLibre + Three.js event-listener orchestration. The placement state machine is intertwined with the live map and BIM raycast APIs; mocking either is brittle. Validated by manual QA in the running viewer.

### FilesManager non-hook components

- `src/core/components/ui/FilesManager/src/FileItemComponent.tsx` — permission-gated rendering. The permission check (`ability.can(...)`) is verified by the consuming app's `buildAbility` tests; the component is a render conditional with no client-side logic to assert on top of that.
- `src/core/components/ui/FilesManager/src/useFileDeleteHandler.ts` — thin error-toast wrapper around an API call. Errors are visible to users (toast appears) and manual QA catches regressions.

### Map viewer UI components

- `src/core/components/viewers/map/src/Geocoder.tsx` — MapLibre Geocoder API + debounce. Mocking MapLibre is brittle and the debounce timing isn't unit-testable cleanly. Same rationale as the BIM/OBC skip.
- `src/core/components/viewers/map/src/MapFeaturePopoverMenu/index.tsx` — feature-type branching is a switch on a known enum; manual QA catches branch additions.
- `src/core/components/viewers/map/datasets/RowActions.tsx` — UI dropdown gated on `usePermissions`. The permission backend is tested; the UI is conditional rendering on already-tested values. (`Filters.tsx` and `AddPortalDialog.tsx` are now tested — they had distinct client-side logic worth covering. See Components inventory above.)

### BIM sidebar UI wrappers

- `src/core/components/viewers/bim/src/BimSidebar/src/SettingsTab/src/GridManagement.tsx`, `LightingManagement.tsx`
- `src/core/components/viewers/bim/src/BimSidebar/src/LayersTab/src/SpatialStructureSection.tsx`, `FloorplanSection.tsx`
- `src/core/components/viewers/bim/src/propertiesMenu/src/useElementProperties.tsx`

UI wrappers around OBC features (grid, lighting, spatial structure, IFC property reads). The underlying classes are already in the BIM/OBC skip list; the UI inherits that exemption.

### Trivial store reducers

- `src/core/store/Map/reducer.ts`, `src/core/store/Tools/reducer.ts` — one-liner setters (`return { ...state, X: action.payload.X }`). No branching to assert. `Menus/reducer.ts` is the reference for the reducer pattern; reducers without branching don't need their own test.

### CRUD hook factories

- `src/core/hooks/buildings/createBuildingHooks.ts` and 8 sibling files (`comments`, `sites`, `users`, `sensors`, `organizations`, `files`, `infrastructures`, `sensorTypes`, `openDataPortals`) — thin SWR wrappers, structurally identical. The HTTP layer is covered by the app's `httpAdapter` test; the hooks add no distinct logic.

### Trivial utility helpers

- `src/core/utils/imageUtils.ts`, `src/core/utils/timeUtils.ts`, `src/core/utils/markerUtils.ts` — one-line URL/date/marker helpers. Bugs are visible immediately in the UI. Add a test only if a non-trivial branch is added later.

### Implicit coverage notes

- `BimSidebar/CommunicationTab/*` and `BimSidebar/FileTab/*` and `MapSidebar/FileTab/*` — implicitly covered by `CollapsibleCommentItem.test.tsx` (comment widgets) and the `useFileActions.test.tsx` + `useFileUploadWithProgress.test.tsx` pair (file actions). The leaf tabs just render those tested widgets.
- Non-factory hooks like `useBuildings()`, `useComments()`, `useSensors()` — thin SWR wrappers on top of the HTTP adapter. The adapter is the reference test (in the consuming app); the hooks have no distinct logic.
- BIM tools (`BIMSearchTool`, `MeasureTool`, `SelectionTool`, etc.) — all instantiate OBC components and fall under the documented BIM/OBC skip list.
