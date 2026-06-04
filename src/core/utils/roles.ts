import type { Role } from '../types/dbTypes'
import { RoleNames } from '../types/global'

const normalizeRoleName = (role?: string) => (role || '').trim().toLowerCase()

export const getNormalizedRoleNames = (userRoles?: Role[] | null) => {
  if (!Array.isArray(userRoles)) return []
  return userRoles
    .map(role => normalizeRoleName(role?.name))
    .filter(Boolean)
}

export const isAdminUser = (userRoles?: Role[] | null) =>
  // getNormalizedRoleNames() lowercases every role name, so the needle must be
  // lowercased too — RoleNames.admin is 'Admin' (capital A), which would never
  // match the lowercased list. (Bug found via unit test; helper was unused.)
  getNormalizedRoleNames(userRoles).includes(RoleNames.admin.toLowerCase())
