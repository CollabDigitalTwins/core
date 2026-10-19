'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { useCreateOpenDataPortal } from '../../../../hooks/openDataPortals/openDataPortals'
import { DatasetGroup, DataManagementSystem } from '../../../../types/dbTypes'
import { Button } from '../../../ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/Dialog'
import { Input } from '../../../ui/Input'
import { Label } from '../../../ui/Label'

import type { OpenDataPortal } from '../../../../types/dbTypes'

interface AddPortalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FormState = Omit<OpenDataPortal, 'id'>

const API_SYSTEMS: ReadonlySet<string> = new Set([
  DataManagementSystem.Ckan,
  DataManagementSystem.Arcgis,
  DataManagementSystem.Opendatasoft,
  DataManagementSystem.Socrata,
])

interface CreateFailure {
  code?: string
  existingName?: string
  message: string
}

// The host adapter rejects with `API error <status>: <response body>`.
function readCreateFailure(error: unknown): CreateFailure {
  const message = error instanceof Error ? error.message : 'Failed to create portal'
  const body = /^API error \d+: ([\s\S]*)$/.exec(message)?.[1]
  if (!body) return { message }
  try {
    const parsed = JSON.parse(body) as { error?: string; code?: string; existingName?: string }
    return { code: parsed.code, existingName: parsed.existingName, message: parsed.error ?? message }
  }
  catch {
    return { message: body }
  }
}

function isHttpUrl(value: string): boolean {
  const absolute = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`
  return URL.canParse(absolute) && ['http:', 'https:'].includes(new URL(absolute).protocol)
}

function toPayload(form: FormState): FormState {
  return {
    name: form.name.trim(),
    group: form.group,
    portalUrl: form.portalUrl?.trim() || undefined,
    dataManagementSystem: form.dataManagementSystem || undefined,
    apiUrl: form.apiUrl?.trim() || undefined,
    countrySubdivision: form.countrySubdivision?.trim() || undefined,
    municipality: form.municipality?.trim() || undefined,
    country: form.country?.trim() || undefined,
  }
}

function validationError(payload: FormState): string | null {
  if (!payload.name) return 'Name is required'
  if (payload.portalUrl && !isHttpUrl(payload.portalUrl)) return 'Portal URL is not a valid URL'
  if (payload.apiUrl && !isHttpUrl(payload.apiUrl)) return 'API URL is not a valid URL'
  const system = payload.dataManagementSystem
  if (system && API_SYSTEMS.has(system) && !payload.apiUrl) return `An API URL is required for ${system} portals`
  return null
}

const EMPTY_FORM: FormState = {
  name: '',
  group: DatasetGroup.Municipal,
  portalUrl: '',
  dataManagementSystem: undefined,
  apiUrl: '',
  countrySubdivision: '',
  municipality: '',
  country: '',
}

export const AddPortalDialog = ({ open, onOpenChange }: AddPortalDialogProps) => {
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const { createOpenDataPortal, isMutating } = useCreateOpenDataPortal()

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = toPayload(form)
    const invalid = validationError(payload)
    setSubmitError(invalid)
    if (invalid) return

    try {
      await createOpenDataPortal(payload)
      toast.success(`${payload.name} is now available to your organization`)
      setForm(EMPTY_FORM)
      onOpenChange(false)
    }
    catch (err) {
      const failure = readCreateFailure(err)
      if (failure.code === 'DUPLICATE_PORTAL') {
        toast.error(`${failure.existingName ?? payload.name} is already registered`, {
          description: 'Each open data portal can only be added once.',
        })
        return
      }
      setSubmitError(failure.code === 'PORTAL_UNREACHABLE' ? `This API can't be used: ${failure.message}` : failure.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Open Data Portal</DialogTitle>
          <DialogDescription>
            Register an external data portal for your organization. Only your organization will see its datasets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="portal-name">
              Name
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="portal-name"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              disabled={isMutating}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="portal-group">
                Group
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <select
                id="portal-group"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.group as string}
                onChange={e => update('group', e.target.value as DatasetGroup)}
                disabled={isMutating}
              >
                {Object.values(DatasetGroup).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="portal-dms">Data Management System</Label>
              <select
                id="portal-dms"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={(form.dataManagementSystem as string) ?? ''}
                onChange={e => update('dataManagementSystem', (e.target.value || undefined) as DataManagementSystem | undefined)}
                disabled={isMutating}
              >
                <option value="">(none)</option>
                {Object.values(DataManagementSystem).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="portal-portalUrl">Portal URL</Label>
            <Input
              id="portal-portalUrl"
              type="url"
              value={form.portalUrl ?? ''}
              onChange={e => update('portalUrl', e.target.value)}
              disabled={isMutating}
              placeholder="https://example.com/open-data"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="portal-apiUrl">API URL</Label>
            <Input
              id="portal-apiUrl"
              type="url"
              value={form.apiUrl ?? ''}
              onChange={e => update('apiUrl', e.target.value)}
              disabled={isMutating}
              placeholder="https://example.com/api"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="portal-municipality">Municipality</Label>
              <Input
                id="portal-municipality"
                value={form.municipality ?? ''}
                onChange={e => update('municipality', e.target.value)}
                disabled={isMutating}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="portal-countrySubdivision">Subdivision</Label>
              <Input
                id="portal-countrySubdivision"
                value={form.countrySubdivision ?? ''}
                onChange={e => update('countrySubdivision', e.target.value)}
                disabled={isMutating}
                placeholder="CA-ON"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="portal-country">Country</Label>
              <Input
                id="portal-country"
                value={form.country ?? ''}
                onChange={e => update('country', e.target.value)}
                disabled={isMutating}
                placeholder="CA"
              />
            </div>
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating
                ? (
                    <>
                      <LR.Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Checking portal…
                    </>
                  )
                : 'Add Portal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
