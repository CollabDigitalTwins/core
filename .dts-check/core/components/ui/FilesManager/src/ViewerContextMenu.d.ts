import * as React from 'react';
import type { DbFile } from '../../../../types/dbTypes';
import type { FileAction } from '../../../../types/global';
export interface ViewerContextMenuProps {
    x: number;
    y: number;
    file: DbFile & {
        isVisible?: boolean;
    };
    options: FileAction[];
    onAction: (action: FileAction, file: DbFile) => void;
    onClose: () => void;
}
export declare const ViewerContextMenu: React.FC<ViewerContextMenuProps>;
//# sourceMappingURL=ViewerContextMenu.d.ts.map