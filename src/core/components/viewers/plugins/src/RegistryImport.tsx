'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { toast } from 'sonner'

import ConfirmDialog from '../../../ConfirmDialog'
import { Button } from '../../../ui/Button'

import { registryErrorMessage } from './registryErrorMessage'

import type { RegistryActions } from '../types'

interface PackagePreview {
  pkg: unknown
  name: string
  version: string
  hostApi: string
  sha256: string
}

function previewOf(pkg: unknown): PackagePreview | null {
  const candidate = pkg as { manifest?: { name?: unknown; version?: unknown; hostApi?: unknown }; sha256?: unknown } | null
  const manifest = candidate?.manifest
  if (typeof manifest?.name !== 'string' || typeof manifest.version !== 'string' || typeof candidate?.sha256 !== 'string') return null
  return { pkg, name: manifest.name, version: manifest.version, hostApi: typeof manifest.hostApi === 'number' ? String(manifest.hostApi) : '?', sha256: candidate.sha256 }
}

/** Platform admins bring a package exported from another deployment's registry into this one. */
export function RegistryImport({ actions }: { actions: RegistryActions }) {
  const t = useTranslations('PluginRegistry')
  const input = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<PackagePreview | null>(null)
  const [busy, setBusy] = React.useState(false)

  const choose = async (file: File | undefined) => {
    if (input.current) input.current.value = ''
    if (!file) return
    const parsed = previewOf(await file.text().then(text => JSON.parse(text) as unknown).catch(() => null))
    if (!parsed) toast.error(t('importInvalidFile'))
    setPreview(parsed)
  }

  const confirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!preview) return
    setBusy(true)
    try {
      const { version, sha256 } = await actions.importPackage(preview.pkg)
      toast.success(t('toastImported', { name: preview.name, version, sha256 }))
      setPreview(null)
    } catch (error) {
      toast.error(t('toastImportFailed', { message: registryErrorMessage(error) }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => input.current?.click()}>
        <LR.FileUp className="h-4 w-4" />
        {t('importPackage')}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        data-testid="registry-import-file"
        onChange={event => void choose(event.target.files?.[0])}
      />

      <ConfirmDialog
        isOpen={preview !== null}
        isDeleting={busy}
        onOpenChange={open => !open && !busy && setPreview(null)}
        handleConfirm={confirm}
        title={preview ? t('importTitle', { name: preview.name, version: preview.version }) : ''}
        description={preview && (
          <>
            {t('importDescription')}
            <span className="mt-2 block break-all font-mono text-xs">
              {t('importFacts', { hostApi: preview.hostApi, sha256: preview.sha256 })}
            </span>
          </>
        )}
        confirmLabel={t('importConfirm')}
        cancelLabel={t('cancel')}
        tone="default"
      />
    </>
  )
}
