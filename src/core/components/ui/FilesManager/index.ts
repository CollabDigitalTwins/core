// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Common UI components for file management
export { FileItemComponent, FileMenuContent } from './src/FileItemComponent'
export type { FileItemComponentProps, FileMenuContentProps } from './src/FileItemComponent'

// Common hooks for file management
export { useFileActions } from './src/useFileActions'
export { useFileVisibility } from './src/useFileVisibility'
export type { UseFileActionsProps } from './src/useFileActions'

export { useCommonFileUpload } from './src/useCommonFileUpload'
export type { UseCommonFileUploadProps } from './src/useCommonFileUpload'
export { useFileUploadWithProgress } from './src/useFileUploadWithProgress'
export type { UseFileUploadWithProgressProps, UploadState } from './src/useFileUploadWithProgress'

// Download utilities
export { downloadFile, downloadDbFile, downloadFromUrl } from './src/downloadUtils'

// Context menu for right-click on files in any viewer
export { ViewerContextMenu } from './src/ViewerContextMenu'
export type { ViewerContextMenuProps } from './src/ViewerContextMenu'

// Re-export existing common components
export { useFileUploadHandler } from './src/useFileUploadHandler'
export { useFileDeleteHandler } from './src/useFileDeleteHandler'

// File type classification
export { EXTENSIONS_FOR_TYPE, SECTION_FOR_TYPE, ACCEPT_FOR_TYPE, typeOfFile, typeOfRecord } from './src/fileType'
export type { FileType, FileSection } from './src/fileType'
