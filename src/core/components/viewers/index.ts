// Audit Phase 1.B (F-13): BimViewer, PointCloudViewer and DataMenu used to
// be re-exported here. Even though Viewer.tsx imports all three via
// next/dynamic (F-1 + F-13), these barrel re-exports were separate STATIC
// references — webpack followed them through components/index.ts →
// core/index.ts → every `import … from 'src/core'` in the app, dragging
// @thatopen, three/webgpu and the entire Data subtree into the eager bundle.
//
// Consumers that genuinely need these symbols use direct file paths:
//   - Viewer.tsx                   -> dynamic-imports all three
//   - FilePreview.tsx              -> direct import of BimViewer / SimpleBimViewer
//   - UsersSettingsPanel.tsx       -> direct import of DataMenu
// Verified by `grep` (2026-05-24): no consumer needs the barrel re-export.
export * from './Viewer'
export * from './map/MapViewer'
export { fetchArcGISDatasets } from './map/datasets/src/arcGISDatasets'
export { fetchCkanDatasets } from './map/datasets/src/ckanDatasets'
export { fetchOpenDataSoftDatasets } from './map/datasets/src/opendatasoftDatasets'
export { fetchSocrataDatasets } from './map/datasets/src/socrataDatasets'
export { fetchLocalDatasets } from './map/datasets/src/localDatasets'