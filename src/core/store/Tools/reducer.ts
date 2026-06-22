// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ToolbarToolType } from '../../types/tools'
import { ActionMap } from '../ActionMap'

interface ToolsTypes {
  currentToolId: ToolbarToolType
}

export type ToolsState = ToolsTypes

export type ToolsPayload = {
  ['SET-TOOL']: Pick<ToolsTypes, 'currentToolId'>
  ['CLEAR-TOOLS']: void
}

export type ToolsActions
  = ActionMap<ToolsPayload>[keyof ActionMap<ToolsPayload>]

export const ToolsReducer = (state: ToolsState, action: ToolsActions) => {
  switch (action.type) {
    case 'SET-TOOL':
      const { currentToolId } = action.payload
      return {
        ...state,
        currentToolId,
      }
    case 'CLEAR-TOOLS':
      return {
        ...state,
        currentToolId: null,
      }

    default:
      return state
  }
}
