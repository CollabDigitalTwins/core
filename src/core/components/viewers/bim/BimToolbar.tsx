'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { bimToolbarTools } from './src/tools/bimToolbar'
import { ToolbarBody } from '../../ToolbarBody'

export function BimToolbar() {
  return <ToolbarBody viewer="bim" tools={bimToolbarTools()} />
}
