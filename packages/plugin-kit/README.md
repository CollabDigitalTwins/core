<div align="center">
  <br />
  <img src="https://github.com/collabdt/docs/raw/main/static/img/cdt-logo.svg" alt="Collab Digital Twins Logo" height="72" />
  <br /><br />

  <h1>@collabdt/plugin-kit</h1>

  <p><strong>Build preset and SDK types for CDT platform plugins</strong></p>

  <p>
    <a href="https://docs.collabdt.org/docs/plugins/overview">Plugin Docs</a> ·
    <a href="https://docs.collabdt.org/docs/plugins/all-capabilities">Capabilities</a> ·
    <a href="https://www.npmjs.com/package/create-cdt-plugin">create-cdt-plugin</a> ·
    <a href="https://collabdt.org">Website</a>
  </p>

  <br />

  <a href="https://www.npmjs.com/package/@collabdt/plugin-kit"><img src="https://img.shields.io/npm/v/@collabdt/plugin-kit?style=flat-square&color=orange&label=%40collabdt%2Fplugin-kit" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/license-AGPL%203.0-orange?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/dependencies-zero-orange?style=flat-square" alt="Zero runtime dependencies" />

  <br /><br />

  <img src="https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tsup-black?style=flat-square" alt="tsup" />
  <img src="https://img.shields.io/badge/Node-22%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node 22+" />

  <br /><br />
  <hr />
  <br />
</div>

## What is this?

The build half of the plugin toolchain for the [CDT platform](https://collabdt.org). It gives a plugin author two things and no runtime dependencies:

- **`pluginPreset()`** — the [tsup](https://tsup.egoist.dev) configuration a plugin needs, plus a post-build guard that fails if the plugin imports anything the platform cannot resolve.
- **Per-surface SDK types** — the shapes a plugin's component receives, without installing `@collabdt/core`.

Most people never install this directly. [`create-cdt-plugin`](https://www.npmjs.com/package/create-cdt-plugin) scaffolds a plugin that already depends on it and is already configured.

---

## Usage

The whole build configuration:

```ts
// tsup.config.ts
import { pluginPreset } from '@collabdt/plugin-kit'

export default pluginPreset()
```

That emits a single ESM `dist/index.js`, marks the platform's shared modules external, and then checks the emitted bundle. Types come from the entry matching your surface:

```ts
import type { MapToolProps, ToolbarToolProps } from '@collabdt/plugin-kit/types/map'
```

| Entry | For | Names |
|---|---|---|
| `@collabdt/plugin-kit/types/map` | `map.tools` | `maplibre-gl` types |
| `@collabdt/plugin-kit/types/bim` | `bim.tools` | `@thatopen/components` types |
| `@collabdt/plugin-kit/types/pointcloud` | `pointcloud.tools` | nothing external |
| `@collabdt/plugin-kit/types/legend` | `map.legends` | nothing external |

Split per surface on purpose. A single combined entry would make a map plugin's typecheck fail on unresolved `@thatopen/components` references it has no reason to install, so only the map and BIM surfaces need a type-only dependency at all.

Your `tsconfig.json` needs `"moduleResolution": "bundler"`, since these are reached through `exports` subpaths. It needs no `paths` mapping: importing from a surface entry pulls in ambient declarations for `@collabdt/core/plugins-sdk*`, which is what lets a plugin typecheck the SDK's real exports without installing core.

---

## Why the guard exists

Marking the platform's modules external is only half the contract. The other half is importing nothing else, and getting that wrong does not fail loudly:

- **Bundle too much** and the plugin ships a second copy of React or three.js. A second React breaks hooks outright; a second three.js crashes the BIM viewer. Both are runtime crashes in someone else's browser, attributed to the plugin rather than to the duplicate.
- **Bundle too little** and a bare specifier survives into the bundle with no import map entry, dying at load with a message that blames the plugin rather than the missing shim.

The guard turns both into a build failure at the moment the import is written. It reads esbuild's metafile rather than scanning the bundle text, because a string literal containing `from 'three'` would fool a regex, and it makes two separate checks:

1. **External imports** catch a specifier the platform publishes no shim for.
2. **Bundled packages** catch a forbidden library that was *inlined*. esbuild only marks an import external if it is on the external list, so an author who has `three` installed and imports it gets a bundle with three.js baked in and no external import to inspect. Check 1 alone would report that bundle clean, which is why it is not the only check.

A plugin may import `react`, `react-dom`, `react/jsx-runtime`, and `@collabdt/core/plugins-sdk` with its `/config`, `/messages`, `/store` and `/components` entries. Nothing else. Viewer instances arrive as props and icons are named by string, so `three`, `@thatopen/components`, `maplibre-gl` and `lucide-react` are never needed at runtime.

---

## What the preset refuses

`pluginPreset()` takes overrides, but rejects the ones that would quietly break delivery or switch the guard off:

| Override | Why it is refused |
|---|---|
| `entry`, `outDir` | The platform serves `dist/index.js` from `src/index.ts` and nothing else. |
| `splitting: true` | A code-split chunk beside `index.js` would not resolve. |
| `format` other than ESM | The browser imports the bundle directly and resolves its bare specifiers through the platform's import map. |
| `external` | It is what the guard checks against. A plugin cannot widen the allowlist. |
| `onSuccess` | It is what runs the guard. Call `assertBundleImports()` from your own step instead. |

Refusing loudly matters more than it sounds: each of these would otherwise produce a build that passes and a plugin that fails later, somewhere less obvious.

---

## Also exported

For a stricter or more forgiving check of your own: `assertBundleImports`, `checkImports`, `checkBundled`, `collectExternalImports`, `collectBundledPackages`, `canVerifyBundled`, `PLUGIN_EXTERNALS`, `KNOWN_FORBIDDEN`, `PLUGIN_METAFILE`, `PLUGIN_OUT_FILE`.

---

## Requirements

Node 22 or newer, and `tsup` 8 or newer as a peer. `@types/react` is a required peer; `maplibre-gl` and `@thatopen/components` are optional peers, needed only for the surface that names them and only as types.

This package has **no runtime dependencies**. Scaffolding a legend plugin should not install three.js to read a config object, which is also why the allowlist is a literal here rather than an import from `@collabdt/core`. A test in core fails if the two ever disagree.

---

## Licensing

Free and open source under the **GNU Affero General Public License, version 3.0** ([full text](LICENSE) · [summary](https://www.gnu.org/licenses/agpl-3.0.en.html)). For commercial licensing, contact **[info@collabdt.org](mailto:info@collabdt.org)**.

> Copyright © 2025 Collab Digital Twins. Distributed under AGPL-3.0.

---

<div align="center">
  <sub>Stewarded by a Canadian not-for-profit organization for long-term public benefit.</sub>
</div>
