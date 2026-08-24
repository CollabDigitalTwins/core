<div align="center">
  <br />
  <img src="https://github.com/collabdt/docs/raw/main/static/img/cdt-logo.svg" alt="Collab Digital Twins Logo" height="72" />
  <br /><br />

  <h1>create-cdt-plugin</h1>

  <p><strong>Scaffold a plugin for the CDT platform</strong></p>

  <p>
    <a href="https://docs.collabdt.org/docs/plugins/overview">Plugin Docs</a> ·
    <a href="https://docs.collabdt.org/docs/plugins/all-capabilities">Capabilities</a> ·
    <a href="https://docs.collabdt.org/docs/plugins/mounting-a-plugin">Mounting</a> ·
    <a href="https://collabdt.org">Website</a>
  </p>

  <br />

  <a href="https://www.npmjs.com/package/create-cdt-plugin"><img src="https://img.shields.io/npm/v/create-cdt-plugin?style=flat-square&color=orange&label=create-cdt-plugin" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@collabdt/plugin-kit"><img src="https://img.shields.io/npm/v/@collabdt/plugin-kit?style=flat-square&color=orange&label=%40collabdt%2Fplugin-kit" alt="plugin-kit version" /></a>
  <img src="https://img.shields.io/badge/license-AGPL%203.0-orange?style=flat-square" alt="License" />

  <br /><br />

  <img src="https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-20232a?style=flat-square&logo=react&logoColor=61dafb" alt="React" />
  <img src="https://img.shields.io/badge/tsup-black?style=flat-square" alt="tsup" />
  <img src="https://img.shields.io/badge/Node-22%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node 22+" />

  <br /><br />
  <hr />
  <br />
</div>

## What is this?

`create-cdt-plugin` scaffolds a working plugin for the [CDT platform](https://collabdt.org): manifest, build configuration, entry point, and a component that reads the viewer. One command gets you from an empty directory to a folder you can build and mount.

A plugin adds something to the platform: a tool on the map, a panel in the BIM viewer, a legend. Think of a browser extension. The platform works without it, and installing one adds a feature.

Two failure modes make writing one by hand harder than ordinary boilerplate, and neither points you at the mistake:

- **Getting the externals list wrong does not fail loudly.** Bundle too little and your plugin ships a second copy of React or three.js, which is a documented crash. Bundle too much and you get a bare specifier the browser cannot resolve, dying at import with a message that blames your plugin rather than the missing shim.
- **A slug that disagrees with its folder name is skipped silently.** The plugin never appears, and nothing explains why.

This tool and [`@collabdt/plugin-kit`](https://www.npmjs.com/package/@collabdt/plugin-kit) exist to turn both into something that fails at build time instead.

---

## Quick start

```bash
npx create-cdt-plugin
```

Answer the prompts, then:

```bash
cd <your-plugin>
npm install
npm run build
```

That writes `dist/index.js`. Mount the folder, enable the plugin, and it renders. Every prompt has a flag equivalent, so the whole thing is scriptable:

```bash
npx create-cdt-plugin --name "Room Inventory" \
  --surface map.tools --body example --yes
```

---

## What you get

```
room-inventory/
  manifest.json          slug, version, hostApi, capabilities, config schema,
                         and messages for en / fr / es
  package.json           build and dev scripts, no runtime dependencies
  tsconfig.json          strict, JSX, and the resolution the SDK types need
  tsup.config.ts         two lines: the build preset, nothing to get wrong
  src/index.ts           activate(ctx) registering your contribution
  src/components/
    RoomInventoryTool.tsx   your component
    ReadoutRow.tsx          a child component, because a plugin is not one file
  README.md              build, mount, enable, and the trust warning
  .gitignore
```

`npm install` then `npm run build` produces exactly what the platform's scanner expects.

The French and Spanish message blocks start as copies of the English ones. Every translation call in the generated source passes an inline English fallback, so an untranslated plugin still reads correctly; having the shape present makes translating it later an edit rather than a research task.

---

## Choosing a surface

Eight capabilities, which is every one the platform renders:

| Surface | Where it appears | What your component receives |
|---|---|---|
| `map.tools` | Map toolbar | The MapLibre map, nullable until it initialises |
| `bim.tools` | BIM viewer toolbar | Model ids, selection, and methods to query, select, isolate and frame elements |
| `pointcloud.tools` | Point cloud toolbar | The Potree viewer as `unknown`, plus a `ready` flag |
| `viewer.legends` | Map legend | Nothing: a legend registers a hook, so its rows can carry live counts |
| `map.layers` | Drawn on the map, for as long as the map exists | The MapLibre map. Renders `null` and manages its own sources and layers |
| `data.pages` | Datasets nav, as a full page | Nothing: you supply a rows hook and columns, and the platform renders the page |
| `viewer.tabs` | Viewer sidebar, as a tab | Nothing: the platform owns the tab strip and panel frame |
| `ui.dialogs` | Anywhere, opened by id | `close`, plus whatever `open(id, props)` passed |

The questionnaire multi-selects, so pick every surface the plugin needs. Choosing one writes the
single-file entry; choosing several writes one `activate` that registers each of them, one body
file per surface, and a `manifest.capabilities` declaring all of them. Adding another later is a
second `ctx.register` call and a second entry in `manifest.capabilities`.

**Picking a viewer surface also decides where your tabs and legends appear.** A `viewer.tabs` or
`viewer.legends` contribution is written with an explicit `viewers` list, taken from the viewer
surfaces you chose — pick `bim.tools` and a tab, and the tab is `viewers: ['bim']` rather than
appearing in all three viewers. Choose no viewer surface and it targets all of them, which is what
omitting the field means; the CLI says so when that happens.

**One plugin can span several.** A map tool, a sidebar tab and a dialog from the same plugin share state through `usePluginState`, which is in memory and scoped to your plugin — so the tool sets a selection and the tab re-renders with it, with no round trip and no shared parent. `ui.dialogs` is what makes that composable: register the dialog once, open it by id from whichever surface needs it, and it stays on screen when the surface that opened it unmounts.

**Drawing on the map is `map.layers`, not `map.tools`.** A tool's panel is a dropdown and unmounts when it closes, taking its sources and layers with it. A `map.layers` contribution is mounted for as long as the map, so what it draws survives — and so does anything another of your surfaces adds while the toolbar is shut.

---

## Two rules that fail silently

Worth knowing before you rename anything.

- **`manifest.slug` must equal the folder name.** The scanner requires it and skips the folder with a single log line otherwise. The scaffolder gets this right; keep it right.
- **Every capability you register must be listed in `manifest.capabilities`.** Registering an undeclared one throws, and the platform then rolls back every contribution your plugin made and marks it errored. That is deliberately all-or-nothing rather than leaving a half-registered plugin.

A plugin may register more than once, under one capability or several. Each entry needs its own `id`: contributions are de-duplicated by plugin and id, so reusing one silently drops the second.

---

## What the build refuses

The generated `tsup.config.ts` is two lines because everything that has to be right lives in the preset:

```ts
import { pluginPreset } from '@collabdt/plugin-kit'

export default pluginPreset()
```

It emits a single ESM file, marks the platform's shared modules external, and then **fails the build if your plugin imports anything else**, naming the specifier and why it cannot be used.

You may import `react`, `react-dom`, `react/jsx-runtime`, and `@collabdt/core/plugins-sdk` with its `/config`, `/messages`, `/store` and `/components` entries. Nothing else.

You never need `three`, `@thatopen/components`, `maplibre-gl` or `lucide-react` at runtime: viewer instances arrive as props and icons are named by string. Type-only imports of the viewer libraries are correct and expected, and the guard keeps them out of the bundle.

`splitting` and `entry` are not preferences either. The platform serves exactly one file per plugin, so a code-split chunk would not resolve. The preset refuses the overrides that would break this rather than accepting them quietly.

---

## Options

| Flag | Values | Notes |
|---|---|---|
| `--name` | string | e.g. `"Room Inventory"` |
| `--slug` | string | Folder name. Defaults to the name, lowercased and hyphenated. |
| `--surface` | see above | The capability to contribute to. Repeatable, and takes a comma-separated list. |
| `--body` | `example`, `empty` | `example` reads the viewer. `empty` renders its own name. |
| `--author` | string | Defaults to `git config user.name`. |
| `--description` | string | |
| `--yes`, `-y` | | Skip the confirmation prompt. |
| `--help` | | |

With no interactive terminal and no `--yes`, the command refuses rather than hanging.

External mode writes into `./plugins/<slug>/` when the current directory already has a `plugins/` folder, and `./<slug>/` otherwise. Running it in a deployment root therefore puts the folder where `PLUGINS_DIR` already points. The resolved path is shown before anything is written, and a non-empty target is refused.

---

## Built-in mode

For a plugin contributed into the platform itself rather than mounted. It writes a smaller tree with no build files, since the plugin is compiled with core, and registers the plugin in both `manifests.ts` and `installed.ts`. A built-in plugin listed in only one of them loads nothing and reports nothing, which is why the scaffolder edits both rather than leaving it to you. If either file does not match the expected shape it prints the snippets to paste and leaves the file untouched.

---

## Requirements

Node 22 or newer. The generated plugin needs no runtime dependencies: its `devDependencies` are `@collabdt/plugin-kit`, `tsup`, `typescript`, React's types, and for the map and BIM surfaces a type-only dependency on `maplibre-gl` or `@thatopen/components`.

`@collabdt/core` is deliberately not among them. A plugin resolves the SDK's types through the kit and the SDK's implementations through the platform's import map at runtime, so scaffolding a legend plugin does not install three.js to read a config object.

---

## A warning worth reading

A mounted plugin runs with the same access as the CDT platform itself. **There is no sandbox.** It is not isolated from the application, its data, or the browser session of whoever has it enabled. Loading mounted plugins is off unless a deployment deliberately enables it, and the extensions page shows what a plugin asks for before an administrator adds it.

Only mount plugins you trust, and read the code of any you did not write. This matters most for generated code, since the usual reason to trust a plugin is having read it.

---

## Licensing

Free and open source under the **GNU Affero General Public License, version 3.0** ([summary](https://www.gnu.org/licenses/agpl-3.0.en.html)).

The templates this tool writes carry the same license, so a plugin scaffolded with it is an AGPL-3.0 work. For commercial licensing, contact **[info@collabdt.org](mailto:info@collabdt.org)**.

> Copyright © 2025 Collab Digital Twins. Distributed under AGPL-3.0.

---

<div align="center">
  <sub>Stewarded by a Canadian not-for-profit organization for long-term public benefit.</sub>
</div>
