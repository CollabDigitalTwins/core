'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { PointCloudContext } from '../../../../../../../../store'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { Button } from '../../../../../../../ui/Button'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { FileItemComponent } from '../../../../../../../ui/FilesManager/src/FileItemComponent'
import { useFileActions } from '../../../../../../../ui/FilesManager/src/useFileActions'
import type { DbFile } from '../../../../../../../../types/dbTypes'
import { toast } from 'sonner'
import { Progress } from '../../../../../../../ui/Progress'


type CreatePointCloudResponse = {
  pointCloud: {
    id: string
    name: string
  }
  upload: {
    uploadUrl: string
  }
}

type StartConversionResponse = {
  jobId: string
}

const POINT_CLOUD_OPTIONS: import('../../../../../../../../types/global').FileAction[] = ['view', 'delete', 'info']

interface PointCloudsSectionProps {
  files: DbFile[]
  pointcloudApiUrl?: string
  buildingId?: number
}

export function PointCloudsSection({ files, pointcloudApiUrl, buildingId }: PointCloudsSectionProps) {
  // Translation
  const t = useTranslations('PointCloudManagement')
  const API_BASE = pointcloudApiUrl ?? 'http://localhost:5101'

  // Get current user session (needed for uploadedBy)
  const { data: session } = useSession()

  // Point cloud context for loading/unloading clouds in the viewer
  const { dispatch: pointCloudDispatch } = React.useContext(PointCloudContext)

  // State for point clouds — includes isVisible to track which are loaded in viewer
  const [pointcloudsFiles, setPointcloudsFiles] = React.useState<(DbFile & { isVisible?: boolean })[]>(
    () => files.map(f => ({ ...f, isVisible: false }))
  )
  const esRef = React.useRef<EventSource | null>(null)
  const autoLoadedRef = React.useRef(false)
  const autoConvertedRef = React.useRef<Set<string>>(new Set())

  // Tracks the in-flight upload's presigned-URL progress (0-100); null when no upload is running
  const [uploadingFile, setUploadingFile] = React.useState<{ name: string; progress: number } | null>(null)
  // Tracks the in-flight Potree conversion's progress (0-100); null when no conversion is running
  const [convertingFile, setConvertingFile] = React.useState<{ name: string; progress: number } | null>(null)

  const fileSyncKey = files
    .map(
      (file) =>
        `${file.id}:${file.name}:${Boolean(file.pointCloudUploaded)}:${Boolean(file.pointCloudPotreeConverted)}:${file.uploadedAt}:${file.potreeMetadataFileKey ?? ''}`
    )
    .join('|')

  // Sync incoming files from props while preserving isVisible state for known files
  React.useEffect(() => {
    setPointcloudsFiles(prev => {
      const prevMap = new Map(prev.map(f => [String(f.id), f]))
      return files.map(f => ({
        ...f,
        isVisible: prevMap.get(String(f.id))?.isVisible ?? false,
      }))
    })
  }, [fileSyncKey])

  // Auto-load the most recently uploaded converted file on first access
  React.useEffect(() => {
    if (autoLoadedRef.current || files.length === 0) return

    const readyFiles = files.filter(f => Boolean(f.pointCloudPotreeConverted))
    if (readyFiles.length === 0) return

    const lastFile = readyFiles.reduce((latest, f) =>
      new Date(f.uploadedAt) > new Date(latest.uploadedAt) ? f : latest
    )

    autoLoadedRef.current = true
    pointCloudDispatch({ type: 'LOAD_POINT_CLOUD', payload: { id: String(lastFile.id) } })
    setPointcloudsFiles(prev =>
      prev.map(f => ({ ...f, isVisible: String(f.id) === String(lastFile.id) }))
    )
  }, [fileSyncKey, files, pointCloudDispatch])

  React.useEffect(() => {
    // Cleanup SSE on unmount
    return () => {
      if (esRef.current) {
        esRef.current.close()
      }
    }
  }, [])

  // Toggle a point cloud on/off in the viewer via context
  const handleView = React.useCallback((file: DbFile, newVisibility: boolean) => {
    const id = String(file.id)
    if (newVisibility) {
      pointCloudDispatch({ type: 'LOAD_POINT_CLOUD', payload: { id } })
    } else {
      pointCloudDispatch({ type: 'UNLOAD_POINT_CLOUD', payload: { id } })
    }
  }, [pointCloudDispatch])

  const handleDeleteFile = React.useCallback(async (file: DbFile) => {
    const res = await fetch(`${API_BASE}/point-cloud/${encodeURIComponent(String(file.id))}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(msg || `Delete failed (${res.status})`)
    }
  }, [])

  const handleConvert = React.useCallback(async (file: DbFile) => {
    const res = await fetch(
      `${API_BASE}/point-cloud/${encodeURIComponent(String(file.id))}/convert-to-potree`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: { sampling_method: 'poisson' } }),
      }
    )

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(msg || `Conversion failed (${res.status})`)
    }

    const { jobId } = await res.json() as StartConversionResponse
    subscribeToProgress(jobId, file.id, file.name)
  }, [])

  // Auto-retry conversion for any uploaded file that never finished converting
  // (e.g. an interrupted session) — silently, with no manual control shown to the user.
  React.useEffect(() => {
    const pending = files.filter(f =>
      Boolean(f.pointCloudUploaded) &&
      !Boolean(f.pointCloudPotreeConverted) &&
      !autoConvertedRef.current.has(String(f.id))
    )

    pending.forEach(f => {
      autoConvertedRef.current.add(String(f.id))
      void handleConvert(f)
    })
  }, [fileSyncKey, files, handleConvert])

  const handleDeletePointCloud = React.useCallback((file: DbFile) => {
    pointCloudDispatch({ type: 'UNLOAD_POINT_CLOUD', payload: { id: String(file.id) } })
  }, [pointCloudDispatch])

  // Use the generic file actions hook
  const { handleAction, deleteDialog } = useFileActions({
    files: pointcloudsFiles,
    setFiles: setPointcloudsFiles as React.Dispatch<React.SetStateAction<(DbFile & { isVisible?: boolean })[]>>,
    buildingId: 0,
    handleDeleteFile,
    onView: handleView,
    onDelete: handleDeletePointCloud,
  })

  // Sort: visible (loaded) files at the top, preserving relative order within each group
  const sortedFiles = React.useMemo(() => {
    return [...pointcloudsFiles].sort((a, b) => {
      const aLoaded = a.isVisible !== false ? 1 : 0
      const bLoaded = b.isVisible !== false ? 1 : 0
      return bLoaded - aLoaded
    })
  }, [pointcloudsFiles])

  // Create point cloud entry — routed through the CDT proxy so that
  // organizationId is injected server-side from the authenticated session.
  async function createPointCloud(name: string, buildingId?: number): Promise<CreatePointCloudResponse> {
    const res = await fetch('/api/point-cloud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, buildingId }),
    })

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(`Create point-cloud failed: ${msg || res.status}`)
    }

    return res.json()
  }

  // Upload to presigned URL
  function uploadToPresignedUrl(
    url: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', url, true)

        if (onProgress) {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 100)
              onProgress(pct)
            }
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed with status ${xhr.status}`))
        }

        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(file)
      } catch (err) {
        reject(err)
      }
    })
  }

  // Start conversion
  async function startConversion(pointCloudId: string): Promise<StartConversionResponse> {
    const res = await fetch(
      `${API_BASE}/point-cloud/${encodeURIComponent(pointCloudId)}/convert-to-potree`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: { sampling_method: 'poisson' } }),
      }
    )

    if (!res.ok) {
      const msg = await res.text()
      throw new Error(`convert-to-potree failed: ${msg || res.status}`)
    }

    return res.json()
  }

  // Subscribe to conversion progress
  function subscribeToProgress(jobId: string, pointCloudId: number, fileName: string) {
    if (!jobId) return

    if (esRef.current) {
      esRef.current.close()
    }

    const es = new EventSource(
      `${API_BASE}/events/convert-progress/${encodeURIComponent(jobId)}`
    )
    esRef.current = es

    setConvertingFile({ name: fileName, progress: 0 })

    es.onopen = () => console.log('SSE connection opened')

    es.onerror = (event) => {
      console.error('SSE error:', event)
      // Update to failed state
      setPointcloudsFiles((prev) =>
        prev.map((pc) =>
          Number(pc.id) === pointCloudId
            ? { ...pc, status: 'idle', conversionProgress: 0 }
            : pc
        )
      )
      setConvertingFile(null)
    }

    es.addEventListener('progress', (event) => {
      try {
        const msgEvent = event as MessageEvent
        const data = JSON.parse(msgEvent.data)

        console.log('[progress]', data.status, data.message, data.progress)

        if (typeof data.progress === 'number') {
          setPointcloudsFiles((prev) =>
            prev.map((pc) =>
              Number(pc.id) === pointCloudId
                ? { ...pc, conversionProgress: data.progress }
                : pc
            )
          )
          setConvertingFile({ name: fileName, progress: data.progress })
        }
      } catch (err) {
        console.error('Failed to parse progress event', err)
      }
    })

    es.addEventListener('finished', () => {
      console.log('[finished] Conversion completed')
      setPointcloudsFiles((prev) =>
        prev.map((pc) =>
          Number(pc.id) === pointCloudId
            ? { ...pc, status: 'idle', conversionProgress: 100 }
            : pc
        )
      )
      setConvertingFile({ name: fileName, progress: 100 })
      toast.success('Point cloud conversion completed')
      es.close()
      esRef.current = null
      setTimeout(() => window.location.reload(), 1000)
    })

    es.addEventListener('failed', () => {
      console.log('[failed] Conversion failed')
      setPointcloudsFiles((prev) =>
        prev.map((pc) =>
          Number(pc.id) === pointCloudId
            ? { ...pc, status: 'idle', conversionProgress: 0 }
            : pc
        )
      )
      setConvertingFile(null)
      es.close()
      esRef.current = null
    })
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file) return

    const originalFileName = file.name
    const fileExt = originalFileName.toLowerCase()
    const baseFileName = originalFileName.replace(/\.(laz|las)$/i, '')

    // Validate file extension
    if (!fileExt.endsWith('.laz') && !fileExt.endsWith('.las')) {
      alert('Please select a LAZ or LAS file.')
      return
    }

    // Check for duplicate names and append (1), (2), etc.
    let fileName = baseFileName
    let counter = 1
    const existingNames = pointcloudsFiles.map((pc) => pc.name)

    while (existingNames.includes(fileName)) {
      fileName = `${baseFileName} (${counter})`
      counter++
    }

    setUploadingFile({ name: fileName, progress: 0 })

    try {
      console.log('Creating point cloud entry...')
      const userEmail = session?.user?.email || null
      const { pointCloud, upload } = await createPointCloud(fileName, buildingId)
      console.log('Point cloud created:', pointCloud.id)

      console.log('Uploading file...')
      await uploadToPresignedUrl(upload.uploadUrl, file, (pct) => {
        setUploadingFile({ name: fileName, progress: pct })
      })
      console.log('Upload complete!')
      toast.success('LAZ file uploaded successfully')

      console.log('Starting conversion...')
      const conversion = await startConversion(pointCloud.id)
      console.log('Conversion started:', conversion.jobId)

      subscribeToProgress(conversion.jobId, Number(pointCloud.id), fileName)
    } catch (error) {
      console.error('Error uploading point cloud:', error)

      alert(
        error instanceof Error
          ? `Failed to upload: ${error.message}`
          : 'Failed to upload point cloud'
      )
    } finally {
      setUploadingFile(null)
    }
  }

  // Handle upload button click
  const handleUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.laz,.las'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    }
    input.click()
  }

  // Retry a row whose original upload never completed (no object in MinIO).
  // Removes orphaned row & lets the user re-pick the file to
  // upload instead of leaving a second duplicate row behind.
  const handleRetryUpload = React.useCallback(async (file: DbFile) => {
    try {
      await handleDeleteFile(file)
      setPointcloudsFiles(prev => prev.filter(pc => String(pc.id) !== String(file.id)))
    } catch (error) {
      console.error('Failed to remove incomplete upload before retry:', error)
      alert(
        error instanceof Error
          ? `Failed to retry upload: ${error.message}`
          : 'Failed to retry upload'
      )
      return
    }
    handleUpload()
  }, [handleDeleteFile])

  return (
    <>
      <CollapsibleSection
        title={t('title')}
        icon={LR.Grip}
        className="h-1/2 overflow-y-auto"
        itemCount={pointcloudsFiles.length}
        onAddItem={handleUpload}
        addItemTitle={t('uploadTitle')}
      >
        <div className="space-y-1">
          {uploadingFile && (
            <div className="px-2 py-1 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{t('uploading')} {uploadingFile.name}</span>
                <span>{uploadingFile.progress}%</span>
              </div>
              <Progress value={uploadingFile.progress} />
            </div>
          )}
          {!uploadingFile && convertingFile && (
            <div className="px-2 py-1 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{t('converting')} {convertingFile.name}</span>
                <span>{convertingFile.progress}%</span>
              </div>
              <Progress value={convertingFile.progress} />
            </div>
          )}
          {sortedFiles.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              {t('noPointClouds')}
            </div>
          ) : (
            sortedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <FileItemComponent
                    file={file}
                    onAction={handleAction}
                    options={POINT_CLOUD_OPTIONS}
                    confirmDelete={false}
                  />
                </div>
                {Boolean(file.pointCloudUploaded) && !Boolean(file.pointCloudPotreeConverted) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0"
                    onClick={() => void handleConvert(file)}
                    title={t('convertTitle')}
                  >
                    <LR.RefreshCw className="h-3 w-3" />
                  </Button>
                )}
                {!Boolean(file.pointCloudUploaded) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0"
                    onClick={() => void handleRetryUpload(file)}
                    title={t('retryUploadTitle')}
                  >
                    <LR.UploadCloud className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        isDeleting={deleteDialog.isDeleting}
        onOpenChange={deleteDialog.onOpenChange}
        handleConfirm={deleteDialog.onConfirm}
        itemName={deleteDialog.itemName}
        dataType="file"
      />
    </>
  )
}
