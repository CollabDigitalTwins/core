import * as React from 'react';
interface ViewerSidebarPanelProps {
    children: React.ReactNode;
    /**
     * 'sections' — the panel does not scroll; its sections manage their own overflow.
     * 'scroll'   — the panel is a single padded, scrolling stack (settings-style).
     */
    variant?: 'sections' | 'scroll';
    /** Renders a search field above the content. */
    search?: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
    };
    className?: string;
}
/**
 * The body wrapper for a viewer sidebar tab. Replaces the wrapper `div` (and the
 * search-field markup above it) that every tab used to copy-paste.
 */
export declare function ViewerSidebarPanel({ children, variant, search, className, }: ViewerSidebarPanelProps): React.JSX.Element;
export {};
//# sourceMappingURL=Panel.d.ts.map