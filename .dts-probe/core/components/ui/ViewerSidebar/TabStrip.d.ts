import * as React from 'react';
import type { ViewerSidebarTab } from './sidebarTabs';
import type { SidebarTabKey } from '../../../store/Menus/reducer';
interface TabStripProps {
    /** Visible tabs, in display order. */
    tabs: ViewerSidebarTab[];
    activeTab: SidebarTabKey;
    onTabChangeAction: (tab: SidebarTabKey) => void;
}
/**
 * The viewer sidebar's tab strip — one implementation for every viewer.
 *
 * Each tab is an icon with its label underneath. When the strip is too narrow for
 * readable labels the labels drop and the icons carry it alone; the name stays
 * available through the tooltip and the accessible name. That is what stops the
 * old text-only strip from degrading into "Se..." / "Set..." on a narrow sidebar.
 */
export declare function TabStrip({ tabs, activeTab, onTabChangeAction }: TabStripProps): React.JSX.Element;
export {};
//# sourceMappingURL=TabStrip.d.ts.map