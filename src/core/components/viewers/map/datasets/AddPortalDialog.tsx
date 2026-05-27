'use client'

import * as React from 'react'
import * as LR from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../ui/Dialog'
import { Button } from '../../../ui/Button'
import { Input } from '../../../ui/Input'
import { Label } from '../../../ui/Label'
import { useCreateOpenDataPortal } from '../../../../hooks/openDataPortals/openDataPortals'
import { DatasetGroup, DataManagementSystem } from '../../../../types/dbTypes'
import type { OpenDataPortal } from '../../../../types/dbTypes'

interface AddPortalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FormState = Omit<OpenDataPortal, 'id'>

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
    setSubmitError(null)
    if (!form.name.trim()) {
      setSubmitError('Name is required')
      return
    }

    // Strip empty optionals so the row doesn't carry literal empty strings.
    const payload: FormState = {
      name: form.name.trim(),
      group: form.group,
      portalUrl: form.portalUrl?.trim() || undefined,
      dataManagementSystem: form.dataManagementSystem || undefined,
      apiUrl: form.apiUrl?.trim() || undefined,
      countrySubdivision: form.countrySubdivision?.trim() || undefined,
      municipality: form.municipality?.trim() || undefined,
      country: form.country?.trim() || undefined,
    }

    try {
      await createOpenDataPortal(payload)
      setForm(EMPTY_FORM)
      onOpenChange(false)
    }
    catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create portal')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Open Data Portal</DialogTitle>
          <DialogDescription>
            Register a new external data portal. Only Name and Group are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
                      Adding…
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
