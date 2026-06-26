import { defineConfig } from 'tsup';

// Second build pass: bundle ONLY the DXFLoader entry, inlining `dxf-viewer`.
//
// Why this exists: dxf-viewer declares `three` as a hard *dependency* pinned to
// `^0.161.0` (i.e. >=0.161.0 <0.162.0) instead of a peerDependency. The rest of
// the stack (@thatopen/*, our own peer `three >=0.175.0`) needs three@0.184, so
// any consuming app had to add a yarn `resolutions: { three }` override, which
// yarn-classic then flags as incompatible with dxf-viewer's range — blocking
// deploys. By bundling dxf-viewer's first-party code into this one output and
// keeping `three` external, dxf-viewer is no longer installed by the consumer at
// all: its `three@^0.161.0` constraint vanishes from the tree, the bundled code's
// `import * as THREE from 'three'` resolves to the consumer's three@0.184, and no
// resolution/override is needed.
//
// dxf-viewer's other deps (opentype.js, earcut, loglevel) stay external and are
// promoted to direct dependencies of @collabdt/core — none of them constrain
// three, and opentype.js references node `fs`, so inlining it would force browser
// `fs` shimming. three and @thatopen/components stay external (peer deps).
//
// This runs AFTER the main `tsup` pass (see package.json build scripts) with
// clean:false, overwriting the main pass's non-bundled DXFLoader/index.js with
// the bundled version at the exact same path so the relative imports from sibling
// modules (../DXFLoader) keep resolving. Types are emitted separately by tsc
// (emitDeclarationOnly) and are unaffected.
export default defineConfig({
    entry: {
        'core/components/viewers/bim/src/DXFLoader/index':
            'src/core/components/viewers/bim/src/DXFLoader/index.ts',
    },
    outDir: 'dist',
    format: ['esm'],
    bundle: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    dts: false,
    treeshake: true,
    // Inline dxf-viewer's first-party modules. Everything else (three,
    // @thatopen/components, opentype.js, earcut, loglevel) is left external via
    // tsup's automatic peer/dependency externalization.
    noExternal: ['dxf-viewer'],
    external: ['three', '@thatopen/components', 'opentype.js', 'earcut', 'loglevel'],
    esbuildOptions(options) {
        options.jsx = 'automatic';
    },
});
