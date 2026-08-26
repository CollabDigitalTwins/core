import * as React from "react";
import type { Building, Site } from '../../../../../types/dbTypes';
interface AddItemProps {
    handleAddBuilding: (building: Building) => void;
    handleAddSite?: (site: Site) => void;
    isComparingSites?: boolean;
    icon?: React.ReactNode;
    className?: string;
    variant?: 'secondary' | 'ghost';
}
export default function AddItem({ handleAddBuilding, handleAddSite, isComparingSites, icon, className, variant }: AddItemProps): React.JSX.Element;
export {};
//# sourceMappingURL=AddItem.d.ts.map