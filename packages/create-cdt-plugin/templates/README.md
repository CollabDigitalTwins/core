# Templates

Real files with `{{TOKEN}}` placeholders, rendered by `src/render.ts`.

Kept as files rather than string literals in TypeScript so each one is reviewable as the
thing it produces, and so the golden build test compiles the same bytes an author receives
instead of a re-assembly of them.

`external/` is a standalone buildable plugin folder. `builtin/` is a plugin that lives
inside core and is compiled with it, so it has no build files of its own. The two trees
duplicate a few files that differ only in their imports: a reader following one tree should
not have to look in the other to know what gets written.

`fragments/` holds one `ctx.register(...)` call per surface, with no imports and no `activate`
around it. It is tree-agnostic on purpose: the register call is identical for a built-in and an
external plugin, and only the imports and the context type differ. A plugin spanning several
surfaces has no single template that could hold its entry, so `scaffold.ts` assembles that one
file from these fragments. A single-surface plugin still comes straight from the tree above,
byte for byte as before.

Two things to keep in mind when editing:

- These files ship in the published package, listed under `files` in `package.json`. tsup
  bundles `src/` and does not copy this directory, so it has to sit beside `dist/` rather
  than inside it.
- `gitignore` is stored without its leading dot. npm strips a `.gitignore` from a published
  tarball regardless of `files`, so the scaffolder writes the dot back on. A template
  renamed to `.gitignore` here would vanish on publish and every scaffolded plugin would
  commit its `dist/`.
