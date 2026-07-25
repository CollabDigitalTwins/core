// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { Organization, User } from '../../types/dbTypes'
import type { ActionMap } from '../ActionMap'

interface AppConfigTypes {
  organization: Organization | null
  user: User | null
  /** Display timezone for sensor time rendering (non-persisted). */
  displayTimeZone: string
  /** True once the user picked a zone, so location defaults stop overriding it. */
  displayTimeZoneUserSet: boolean
}

export type AppConfigState = AppConfigTypes

export type AppConfigPayload = {
  ['SET_ORGANIZATION']:  Pick<AppConfigTypes, 'organization'>
  ['SET_USER']: Pick<AppConfigTypes, 'user'>
  ['SET_DISPLAY_TIME_ZONE']: { displayTimeZone: string }
  ['SET_DEFAULT_TIME_ZONE']: { displayTimeZone: string }
}

export type AppConfigActions
  = ActionMap<AppConfigPayload>[keyof ActionMap<AppConfigPayload>]

export const AppConfigReducer = (state: AppConfigState, action: AppConfigActions) => {
  switch (action.type) {
    case 'SET_ORGANIZATION':
      const { organization } = action.payload
      return {
        ...state,
        organization,
      }
    case 'SET_USER':
      const { user } = action.payload
      return {
        ...state,
        user,
      }
    case 'SET_DISPLAY_TIME_ZONE':
      return {
        ...state,
        displayTimeZone: action.payload.displayTimeZone,
        displayTimeZoneUserSet: true,
      }
    case 'SET_DEFAULT_TIME_ZONE':
      // Location-derived default: apply only until the user makes an explicit choice.
      if (state.displayTimeZoneUserSet) return state
      return {
        ...state,
        displayTimeZone: action.payload.displayTimeZone,
      }
    default:

      return state
  }
}
