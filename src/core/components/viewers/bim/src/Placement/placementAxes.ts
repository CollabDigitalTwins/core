// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export const AXES = ['X', 'Y', 'Z'] as const

// The card is Z-up like the BIM authoring tools; the scene is Y-up. Index by display axis.
export const WORLD_AXIS = [0, 2, 1] as const

export const toDegrees = (radians: number) => Math.round((radians * 180) / Math.PI * 100) / 100
export const toRadians = (degrees: number) => (degrees * Math.PI) / 180
