import { Organization, User } from '../../types/dbTypes'
import { ActionMap } from '../ActionMap'

interface AppConfigTypes {
  organization: Organization | null
  user: User | null
}

export type AppConfigState = AppConfigTypes

export type AppConfigPayload = {
  ['SET_ORGANIZATION']:  Pick<AppConfigTypes, 'organization'>
  ['SET_USER']: Pick<AppConfigTypes, 'user'>
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
    default:
      
      return state
  }
}
  