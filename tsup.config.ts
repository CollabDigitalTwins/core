import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: false,
    bundle: true,
    external: [
        // React ecosystem
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'react-dom/server',
        'react-google-recaptcha',
        'use-sync-external-store',
        'use-sync-external-store/shim',

        // Next.js ecosystem
        'next',
        'next/router',
        'next/link',
        'next/image',
        'next/navigation',
        'next/headers',
        'next/server',
        'next-auth',
        'next-auth/react',
        'next-auth/next',
        'next-intl',
        'next-themes',

        // UI libraries
        'framer-motion',
        'lucide-react',
        'sonner',

        // Data fetching
        'swr',
        'swr/mutation',
        'swr/immutable',

        // Map libraries
        'maplibre-gl',
        'react-map-gl',

        // 3D libraries
        'three',
        'three/examples/jsm/loaders/GLTFLoader',
        'three/examples/jsm/controls/OrbitControls',

        // Radix UI (all packages)
        '@radix-ui/react-accordion',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-avatar',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-label',
        '@radix-ui/react-menubar',
        '@radix-ui/react-popover',
        '@radix-ui/react-progress',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-slider',
        '@radix-ui/react-slot',
        '@radix-ui/react-switch',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-visually-hidden',

        // Other libraries
        'cmdk',
        'date-fns',
        'react-day-picker',
        '@tanstack/react-table',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        '@casl/ability',
        'jspdf',
        'recharts',

        // GIS/Mapping utilities
        'pbf',
        'geojson',
        '@mapbox/vector-tile',
        'proj4',
        '@turf/turf',

        // ThatOpen libraries
        '@thatopen/components',
        '@thatopen/components-front',
        '@thatopen/fragments',
        '@thatopen/ui',
        '@thatopen/ui-obc',

        // Other dependencies
        'web-ifc',
        'dxf-viewer',
        'potree',
        'potree-cdt',
        'three-viewport-gizmo',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
    ],
    banner: {
        js: "'use client';",
    },
    esbuildOptions(options) {
        options.jsx = 'automatic';
    },
});