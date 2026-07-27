"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import {
  MoreHorizontal,
  FileOutput,
  FileInput,
  FileText,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

// Shadcn Components

// Icons

// Types


import { mutate } from 'swr'

import { Button } from '../../../../components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../components/ui/DropdownMenu'
import { useOrganizationRoles } from '../../../../hooks/organizations/organizations'
import { useCreateUser } from '../../../../hooks/users/users'
import { usePermissions } from '../../../../store'

import type { User } from '../../../../types/dbTypes'


interface UserMoreOptionsProps {
  users?: User[]
  variant?: 'ghost' | 'outline' | 'default'
}

export default function UserMoreOptions({ users, variant }: UserMoreOptionsProps) {
  // Translations
  const t = useTranslations('UserMoreOptions')

  // Permissions
  const { ability } = usePermissions()

  const [isExporting, setIsExporting] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const { createUser } = useCreateUser()

    const { user } = useSession().data
    const { organizationId } = user
    const { organizationRoles } = useOrganizationRoles(String(organizationId))

  // Helper function to update a user - follows the same pattern as the adapter's updateUser
  const updateUserById = async (userId: number, patch: Partial<User> & { role?: string }) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!response.ok) {
      throw new Error('Failed to update user')
    }
    return response.json()
  }

  const handleExportUsers = async () => {
    if (!users || users.length === 0) {
      toast.error(t('errors.noUsersToExport'))
      return
    }

    setIsExporting(true)
    try {
      // Only export fields that are in the schema (name, email, role)
      // Password is never exported for security reasons
      const headers = 'name,email,role'

      // Fetch roles for all users
      const usersWithRoles = await Promise.all(
        users.map(async (user) => {
          try {
            const response = await fetch(`/api/users/${user.id}/role`)
            if (response.ok) {
              const data = await response.json()
              const roles = data.roles || []
              const roleName = roles.length > 0 ? roles[0].name : ''
              return { ...user, role: roleName }
            }
          } catch (error) {
            console.error(`Error fetching role for user ${user.id}:`, error)
          }
          return { ...user, role: '' }
        })
      )

      // Extract only the schema fields for each user
      const rows = usersWithRoles.map(user => {
        const name = user.name || ''
        const email = user.email || ''
        const role = user.role || ''
        return `"${name.replaceAll('"', '""')}","${email.replaceAll('"', '""')}","${role.replaceAll('"', '""')}"`
      }).join('\n')

      // Combine headers and data rows into complete CSV content
      const content = `${headers}\n${rows}`

      // Generate a timestamp for the filename
      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19)
      const filename = `users_${timestamp}.csv`

      // Create a blob with the CSV content
      const blob = new Blob([content], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)

      // Create a temporary link element to trigger the download
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()

      // Clean up the URL object
      URL.revokeObjectURL(url)

      toast.success(t('success.usersExported'))
    } catch (error) {
      console.error('Error exporting users:', error)
      toast.error(t('errors.exportFailed'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportUsers = () => {
    // Create a file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsImporting(true)
      try {
        const text = await file.text()

        // Parse CSV manually
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          toast.error(t('errors.csvEmpty'))
          return
        }

        // Extract headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

        // Validate required headers
        const requiredHeaders = ['name', 'email', 'role', 'password']
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
        if (missingHeaders.length > 0) {
          toast.error(t('errors.missingColumns', { columns: missingHeaders.join(', ') }))
          return
        }

        // Parse each row
        const newUsers: Array<{ name: string; email: string; roleId: number; password: string }> = []
        const errors: string[] = []

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i]
          // Simple CSV parsing (handles quoted fields)
          const values: string[] = []
          let current = ''
          let inQuotes = false

          for (let j = 0; j < line.length; j++) {
            const char = line[j]
            if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          values.push(current.trim())

          // Create user object
          const userObj: Record<string, string> = {}
          headers.forEach((header, idx) => {
            userObj[header] = values[idx] || ''
          })

          // Validate user data
          const name = userObj.name?.trim()
          const email = userObj.email?.trim()
          const role = userObj.role?.trim()
          const password = userObj.password?.trim()

          if (!name || !email || !role || !password) {
            errors.push(t('errors.rowMissingFields', { row: i + 1 }))
            continue
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
            errors.push(t('errors.rowInvalidEmail', { row: i + 1 }))
            continue
          }

          // Validate password strength
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])[^\s]{12,65}$/
          if (!passwordRegex.test(password)) {
            errors.push(t('errors.rowWeakPassword', { row: i + 1 }))
            continue
          }

          let roleId = -1

          // Validate role
          const validRoles = organizationRoles.map(role => role.name.toLowerCase())
          if (!validRoles.includes(role.toLowerCase())) {
            errors.push(t('errors.rowInvalidRole', { row: i + 1, roles: validRoles.join(', ') }))
            continue
          }

          // Find the roleId for the given role name
          const roleObj = organizationRoles.find(r => r.name.toLowerCase() === role.toLowerCase())
          if (roleObj) {
            roleId = roleObj.id
          }

          newUsers.push({ name, email, roleId, password })
        }

        if (errors.length > 0) {
          toast.error(t('errors.validationErrors', { count: errors.length, first: errors[0] }))
          console.error('Import errors:', errors)
        }

        if (newUsers.length === 0) {
          toast.error(t('errors.noValidUsers'))
          return
        }

        // Process users: check if they exist and create/update accordingly
        let createdCount = 0
        let updatedCount = 0
        let failedCount = 0

        for (const newUser of newUsers) {
          try {
            // Check if user exists by email
            const existingUser = users?.find(u => u.email.toLowerCase() === newUser.email.toLowerCase())

            if (existingUser) {
              // Fetch current role
              const roleResponse = await fetch(`/api/users/${existingUser.id}/role`)
              let currentRole = -1
              if (roleResponse.ok) {
                const roleData = await roleResponse.json()
                const roles = roleData.roles || []
                currentRole = roles.length > 0 ? roles[0].name.toLowerCase() : ''
              }

              // Check for differences
              const nameChanged = existingUser.name !== newUser.name
              const roleChanged = currentRole !== newUser.roleId

              if (nameChanged || roleChanged) {
                // Update user using the same pattern as AccountSettingsPanel
                const updatePayload: Partial<User> & { roleId?: number } = {}
                if (nameChanged) updatePayload.name = newUser.name
                if (roleChanged) updatePayload.roleId = newUser.roleId

                try {
                  await updateUserById(existingUser.id, updatePayload)
                  updatedCount++
                  // Trigger cache refresh for this user and their roles
                  void mutate(['user', String(existingUser.id)])
                  if (roleChanged) {
                    void mutate(['userRoles', String(existingUser.id)])
                  }
                } catch (error) {
                  failedCount++
                  console.error('Failed to update user:', newUser.email, error)
                }
              } else {
                // No changes needed
              }
            } else {
              // Create new user using the hook
              try {
                await createUser({
                  userData: {
                    name: newUser.name,
                    email: newUser.email,
                    password: newUser.password,
                    roleId: newUser.roleId,
                  }
                })
                createdCount++
              } catch (error) {
                failedCount++
                console.error('Failed to create user:', newUser.email, error)
              }
            }
          } catch (error) {
            failedCount++
            console.error('Error processing user:', newUser.email, error)
          }
        }

        // Show summary
        const messages = []
        if (createdCount > 0) messages.push(t('summary.created', { count: createdCount }))
        if (updatedCount > 0) messages.push(t('summary.updated', { count: updatedCount }))
        if (failedCount > 0) messages.push(t('summary.failed', { count: failedCount }))

        if (createdCount > 0 || updatedCount > 0) {
          // Refresh the users list cache
          await mutate(['users'])
          toast.success(t('success.importComplete', { summary: messages.join(', ') }))
        } else if (failedCount > 0) {
          toast.error(t('errors.importAllFailed', { count: failedCount }))
        } else {
          toast.info(t('success.noChanges'))
        }
      } catch (error) {
        console.error('Error importing users:', error)
        toast.error(t('errors.importFailed'))
      } finally {
        setIsImporting(false)
      }
    }

    input.click()
  }

  const handleDownloadSchema = () => {
    // Create a CSV template with headers and an example row
    const headers = 'name,email,role,password'
    const example = '"Terry Fox","terry.fox@example.com","User","password123"'
    const content = `${headers}\n${example}`

    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'users-schema.csv'
    link.click()

    URL.revokeObjectURL(url)
    toast.success(t('success.schemaDownloaded'))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant || 'outline'}
          className="dropdown-menu-trigger"
          onClick={e => e.stopPropagation()}
          disabled={!ability.can('read', 'Role')}
        >
          <MoreHorizontal />
          <span className="sr-only">{t('openMenu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void handleExportUsers()} disabled={isExporting || isImporting || !ability.can('read', 'Role')}>
          <FileOutput />
          {isExporting ? t('actions.exporting') : t('actions.exportUsers')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleImportUsers} disabled={isExporting || isImporting || !ability.can('create', 'User')}>
          <FileInput />
          {isImporting ? t('actions.importing') : t('actions.importUsers')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadSchema} disabled={!ability.can('read', 'User')}>
          <FileText />
          {t('actions.downloadSchema')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
