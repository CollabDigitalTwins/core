// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

const safeAcceptedFileExtensions = [
	// images
	'.jpg',
	'.jpeg',
	'.png',
	'.gif',
	'.svg',
	'.webp',
	'.bmp',

	// media (video/audio)
	'.mp4',
	'.webm',
	'.mov',
	'.avi',
	'.mkv',
	'.mp3',
	'.wav',
	'.ogg',
	'.m4a',
	'.flac',

	// office and text documents
	'.pdf',
	'.doc',
	'.docx',
	'.xls',
	'.xlsx',
	'.ppt',
	'.pptx',
	'.txt',
	'.csv',
	'.json',

	// GIS vectors
	'.geojson',
	'.shp',
	'.dbf',
	'.shx',
	'.prj',
	'.cpg',

	// openBIM and CAD
	'.ifc',
	'.ids',
	'.bcf',
	'.bcfzip',
	'.dxf',
	'.dwg',
	'.rvt',

	// energy analysis
	'.h2k',

	// 3D models and shaders
	'.frag',
	'.glb',
	'.gltf',
	'.obj',
	'.fbx',
	'.stl',
	'.dae',
	'.ply',
] as const

const safeAcceptedMimeTypes = [
	// images
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/bmp',
	'image/svg+xml',
	'image/webp',

	// media (video/audio)
	'video/mp4',
	'video/webm',
	'video/quicktime',
	'video/x-msvideo',
	'video/x-matroska',
	'audio/mpeg',
	'audio/wav',
	'audio/wave',
	'audio/ogg',
	'audio/mp4',
	'audio/x-m4a',
	'audio/flac',

	// office and text documents
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'text/plain',
	'text/csv',
	'application/json',

	// GIS and CAD
	'application/geo+json',
	'application/dxf',
	'image/vnd.dxf',

	// 3D models
	'model/gltf-binary',
	'model/gltf+json',
	'model/obj',
	'model/stl',
	'model/vnd.collada+xml',
] as const

const acceptedExtensionSet = new Set<string>(safeAcceptedFileExtensions)
const acceptedMimeTypeSet = new Set<string>(safeAcceptedMimeTypes)

export const acceptedFiles = [
	...safeAcceptedFileExtensions,
	...safeAcceptedMimeTypes,
].join(',')

export function isAcceptedFileType(file: File): boolean {
	const extension = file.name.includes('.')
		? `.${file.name.split('.').pop()?.toLowerCase()}`
		: ''

	const mimeType = file.type?.toLowerCase() || ''

	if (acceptedExtensionSet.has(extension)) {
		return true
	}

	if (acceptedMimeTypeSet.has(mimeType)) {
		return true
	}

	return false
}