// Component exports (named exports)
export { Accordion } from './Accordion';
export { AlertDialog } from './AlertDialog';
export {AppSidebar} from './AppSidebar';
export { Avatar } from './Avatar';
export { Badge, ItemsBadgeButton } from './Badge';
export type { BadgeProps } from './Badge';
export { Breadcrumb } from './Breadcrumb';
export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Calendar } from './Calendar';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './Card';
export { Checkbox } from './Checkbox';
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './chart';
export type { ChartConfig } from './chart';
export { CollapsibleSection } from './CollapsibleSection';
export { Command } from './Command';
export { DataTable } from './DataTable';
export { DatePicker } from './DatePicker';
export { DescriptionList } from './DescriptionList';
export { Dialog } from './Dialog';
export { DropdownMenu } from './DropdownMenu';
export { GenericTool } from './GenericTool';
export * from './Icons';
export { Input } from './Input';
export { Label } from './Label';
export { LoadingSpinner } from './LoadingSpinner';
export { Menubar } from './Menubar';
export { NavUser } from './NavUser';
export { Popover } from './Popover';
export { Progress } from './Progress';
export { ScrollArea } from './ScrollArea';
export { SearchInput } from './SearchInput';
export { Select } from './Select';
export { Separator } from './Separator';
export { Sheet } from './Sheet';
export { Sidebar, SidebarProvider, SidebarTrigger, useSidebar } from './Sidebar';
export { Skeleton } from './Skeleton';
export { Slider } from './Slider';
export { Switch } from './Switch';
export { Table } from './Table';
export { Tabs } from './Tabs';
export { Textarea } from './Textarea';
export { Toggle } from './Toggle';
export { ToggleGroup } from './ToggleGroup';
export { Tooltip } from './Tooltip';

// Component exports (default exports - re-exported as named)
export { default as ColorCircle } from './ColorCircle';
export { default as Countdown } from './Countdown';
export { default as ExportData } from './ExportData';
export { default as ToolbarButton } from './ToolbarButton';
export { default as LanguageToggle } from './LanguageToggle';
export { default as AnimatedBackground } from './AnimatedBackground';

// Sonner exports
export { Toaster } from './Sonner';

// Utility exports
export * from './downloadUtils';
export * from './stats';
export * from './uploadFile';

// Comments UI
export { CommentInput } from './Comments/CommentInput';
export type { BimCommentPlacementContext, CommentInputLayout, CommentInputProps } from './Comments/CommentInput';

// Popup window utilities (renamed to avoid conflicts)
export { openPopupWindow } from './openPopupWindow';
export { openPopupWindow as openPopupWindowLCA } from './openPopupWindowLCA';

// FilesManager exports (excluding duplicate downloadUtils exports)
export { FileItemComponent } from './FilesManager';
export type { FileItemComponentProps } from './FilesManager';
export { useFileActions } from './FilesManager';
export type { UseFileActionsProps } from './FilesManager';
export { useCommonFileUpload } from './FilesManager';
export type { UseCommonFileUploadProps } from './FilesManager';
export { useFileUploadHandler } from './FilesManager';
export { useFileDeleteHandler } from './FilesManager';

// ShareFeature exports
export * from './ShareFeature';

// InfoSidebar
export { InfoSidebar } from './InfoSidebar';

// AddingMedia components
export { default as FileMarker } from './FilesManager/src/FileMarker';

// LucideLabIcons components
export { CdtIcon } from './Icons/CdtIcon';
export { FloorplanIcon } from './Icons/FloorPlanIcon';
