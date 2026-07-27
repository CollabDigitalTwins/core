'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { ToolbarBody } from '../../ToolbarBody'

import { useBimToolbarTools } from './src/tools/bimToolbar'

export function BimToolbar({ minioBaseUrl }: { minioBaseUrl?: string }) {
  return <ToolbarBody viewer="bim" tools={useBimToolbarTools({ minioBaseUrl })} />
}
