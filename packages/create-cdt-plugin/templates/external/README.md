# {{NAME}}

{{DESCRIPTION}}

A plugin for the CDT platform, contributing to `{{CAPABILITY}}`.

## Build it

```bash
npm install
npm run build
```

That writes `dist/index.js`, a single ESM file. The CDT platform looks for exactly that
path, so a folder without it is skipped at discovery with a log line rather than listed.
Mounting source you forgot to build is the likeliest mistake.

The build fails if this plugin imports anything the platform does not publish a shim for.
That is deliberate. A second copy of React breaks hooks outright and a second copy of
three.js crashes the BIM viewer, so the import guard turns both into a build error at the
moment the import is written rather than a crash in someone's browser.

You may import `react`, `react-dom`, `react/jsx-runtime`, and `@collabdt/core/plugins-sdk`
with its `/config`, `/messages`, `/store` and `/components` entries. Nothing else. Viewer
instances arrive as props and icons are named by string, so you never need `three`,
`@thatopen/components`, `maplibre-gl` or `lucide-react` at runtime.

## Growing past one component

The single-file rule is about the built bundle, not about how you write the plugin. Author
across as many files and components as you like: the build bundles `src/` into one
`dist/index.js`. This plugin already does that, with its tool component importing
`ReadoutRow` from a file of its own.

`activate()` may also register more than once. Several entries under one capability give
you several toolbar buttons, each with its own component, and a plugin can contribute to
more than one surface at a time:

```ts
// manifest.json: "capabilities": ["map.tools", "viewer.legends"]
export function activate(ctx: MapPluginContext): void {
  ctx.register('map.tools', {
    id: '{{SLUG}}-inspect', label: 'Inspect', icon: 'Search', component: InspectTool,
  })
  ctx.register('map.tools', {
    id: '{{SLUG}}-measure', label: 'Measure', icon: 'Ruler', component: MeasureTool,
  })
}
```

Two rules apply once you do this:

- **Every capability you register must be listed in `manifest.capabilities`.** Registering
  an undeclared one throws, and the platform then rolls back every registration this plugin
  made and marks it errored. That is deliberately all-or-nothing rather than leaving a
  half-registered plugin.
- **Each entry needs a distinct `id`.** Entries are de-duplicated by plugin and id, so a
  second registration reusing an id is dropped without an error.

What you cannot do is lazy-load part of your own plugin. The platform serves exactly one
file, so a code-split chunk would not resolve. Everything in the bundle loads when the
plugin activates, which makes bundle size the thing to watch rather than file count.

## Mount it

Point a CDT platform deployment at the folder holding this one:

```yaml
services:
  cdt:
    environment:
      PLUGINS_ENABLED: "true"
      PLUGINS_DIR: /app/plugins
    volumes:
      - ./plugins:/app/plugins:ro
```

Set `PLUGINS_DEV=true` while developing so nothing is cached and a browser refresh picks up
a rebuild. There is no hot reloading: save, `npm run build`, refresh.

## Enable it

A mounted plugin is not running yet. An administrator makes it available to an organization
on the extensions page, and then each person chooses whether it runs for them. It is
working when it appears under **Found on this server**, and rendering once enabled. Nothing
short of that last step proves it works.

## Translations

`manifest.json` carries `messages` for English, French and Spanish. The French and Spanish
strings start as copies of the English ones, so translating this plugin is an edit rather
than a research task. Every translation call in the source passes an inline English
fallback, so the plugin reads correctly in a locale it has not translated.

## A warning worth reading

A mounted plugin runs with the same access as the CDT platform itself. There is no sandbox.
Only mount plugins you trust, and read the code of any you did not write.
