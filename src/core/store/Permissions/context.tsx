'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { AbilityBuilder, createMongoAbility } from '@casl/ability'
import type { MongoAbility } from '@casl/ability'
import type { Permission } from '../../../app/lib/permissions/type'
import { useUserRole } from '../../hooks/users/users'

interface PermissionsContextValue {
  ability: MongoAbility
  permissions: Permission[]
  isLoading: boolean
  role: any
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined)

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const userId = session?.user?.id || ''
  const { userRole, isLoading } = useUserRole(userId)
  
  const permissions = (userRole?.permissions as Permission[]) ?? []
  
  // Build CASL ability - memoized to only rebuild when permissions change
  const ability = useMemo(() => {
    const { can, build } = new AbilityBuilder(createMongoAbility)
    for (const p of permissions) {
      can(p.action, p.subject)
    }
    return build()
  }, [permissions])

  const value = {
    ability,
    permissions,
    isLoading,
    role: userRole,
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}