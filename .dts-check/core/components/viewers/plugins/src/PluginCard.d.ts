import * as React from 'react';
import type { PluginListing, PluginsAbility } from '../types';
interface Props {
    listing: PluginListing;
    ability: PluginsAbility;
    onSetInstalled: (installed: boolean) => void;
    onSetOrgEnabled: (enabled: boolean) => void;
    onSetAllowUserOverride: (allow: boolean) => void;
    onSetUserEnabled: (enabled: boolean) => void;
    onCopyError: () => void;
}
export declare function PluginCard({ listing, ability, onSetInstalled, onSetOrgEnabled, onSetAllowUserOverride, onSetUserEnabled, onCopyError, }: Props): React.JSX.Element;
export {};
//# sourceMappingURL=PluginCard.d.ts.map