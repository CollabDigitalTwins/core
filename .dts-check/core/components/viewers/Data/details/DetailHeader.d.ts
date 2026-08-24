import type { Building, Infrastructure, Site, User } from '../../../../types/dbTypes';
import type { FileRow } from '../../../../types/files';
interface DetailHeaderProps {
    selectedItem?: Building | null;
    selectedSite?: Site | null;
    selectedInfrastructure?: Infrastructure | null;
    selectedFile?: FileRow | null;
    selectedUser?: Partial<User> | null;
    countryCode?: string | null;
}
export default function DetailHeader({ selectedItem, selectedSite, selectedInfrastructure, selectedFile, selectedUser, countryCode, }: DetailHeaderProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=DetailHeader.d.ts.map