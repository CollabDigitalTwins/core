# Changelog — create-cdt-plugin

All notable changes to this package will be documented in this file.

The format is based on Keep a Changelog, and this package adheres to Semantic Versioning.
It versions and publishes independently of `@collabdt/core`; the core changelog is at the
repository root.

## [Unreleased]

## [0.6.0] - 2026-09-14

### Changed
- **`DEFAULT_KIT_SPEC` is `^0.6.0`.** A plugin scaffolded with this version installs
  `@collabdt/plugin-kit@^0.6.0`, which is the first kit without the point-cloud surface.

### Removed
- **The point-cloud surface from the questionnaire**, along with the `ExamplePointcloud`
  template component it wrote. Core no longer has a standalone point-cloud viewer to
  register against.
- `pointcloud` from the `viewers` list a `viewer.tabs` or `viewer.legends` registration
  accepts. The list is `'map' | 'bim'`, and omitting it means both.

### Migration
- Nothing to do for an existing plugin: this package only writes new ones. A plugin already
  scaffolded against a point-cloud surface should follow the migration notes in
  `@collabdt/plugin-kit`'s 0.6.0 entry.
