'use client'

import * as React from 'react'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { FileItemComponent } from '../../../../../../../ui/FilesManager/src/FileItemComponent'
import { useFileActions } from '../../../../../../../ui/FilesManager/src/useFileActions'
import ConfirmDialog from '../../../../../../../ConfirmDialog'
import { Button } from '../../../../../../../ui/Button'
import { useOrganization } from '../../../../../../../../hooks/organizations/organizations'
import { DbFile } from '../../../../../../../../types/dbTypes'
import { PointCloudContext } from '../../../../../../../../store'

const API_BASE = process.env.NEXT_PUBLIC_POINTCLOUD_API_URL ?? 'http://localhost:5101'

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

interface PointCloudsSectionProps {
  files: DbFile[]
}

export function PointCloudsSection({ files }: PointCloudsSectionProps) {
  // Translation
  const t = useTranslations('PointCloudManagement')

  // Get current user session
  const { data: session } = useSession()
  const organizationId = session?.user?.organizationId ?? null;
  const { organization } = useOrganization(organizationId ? organizationId.toString() : null);

  // Point cloud context for loading/unloading clouds in the viewer
  const { dispatch: pointCloudDispatch } = React.useContext(PointCloudContext)

  // State for point clouds — includes isVisible to track which are loaded in viewer
  const [pointcloudsFiles, setPointcloudsFiles] = React.useState<(DbFile & { isVisible?: boolean })[]>(
    () => files.map(f => ({ ...f, isVisible: false }))
  )
  const esRef = React.useRef<EventSource | null>(null)
  const autoLoadedRef = React.useRef(false)

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
    subscribeToProgress(jobId, file.id)
  }, [])

  // Use the generic file actions hook
  const { handleAction, deleteDialog } = useFileActions({
    files: pointcloudsFiles,
    setFiles: setPointcloudsFiles as React.Dispatch<React.SetStateAction<(DbFile & { isVisible?: boolean })[]>>,
    buildingId: 0,
    handleDeleteFile,
    onView: (file, newVisibility) => handleView(file, newVisibility),
    onDelete: (file) => {
      // Ensure the cloud is unloaded from the viewer when deleted
      pointCloudDispatch({ type: 'UNLOAD_POINT_CLOUD', payload: { id: String(file.id) } })
    },
  })

  // Sort: visible (loaded) files at the top, preserving relative order within each group
  const sortedFiles = React.useMemo(() => {
    return [...pointcloudsFiles].sort((a, b) => {
      const aLoaded = a.isVisible !== false ? 1 : 0
      const bLoaded = b.isVisible !== false ? 1 : 0
      return bLoaded - aLoaded
    })
  }, [pointcloudsFiles])

  // Create point cloud entry
  async function createPointCloud(name: string, uploadedBy: string | null): Promise<CreatePointCloudResponse> {
    const res = await fetch(`${API_BASE}/point-cloud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        uploadedBy,
        organizationName: organization?.name,
        organizationId: organizationId
      }),
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
  function subscribeToProgress(jobId: string, pointCloudId: number) {
    if (!jobId) return

    if (esRef.current) {
      esRef.current.close()
    }

    const es = new EventSource(
      `${API_BASE}/events/convert-progress/${encodeURIComponent(jobId)}`
    )
    esRef.current = es

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
      es.close()
      esRef.current = null
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

    try {
      console.log('Creating point cloud entry...')
      const userEmail = session?.user?.email || null
      const { pointCloud, upload } = await createPointCloud(fileName, userEmail)
      console.log('Point cloud created:', pointCloud.id)

      console.log('Uploading file...')
      await uploadToPresignedUrl(upload.uploadUrl, file, (pct) => {
        console.log(`Upload progress: ${pct}%`)
      })
      console.log('Upload complete!')

      console.log('Starting conversion...')
      const conversion = await startConversion(pointCloud.id)
      console.log('Conversion started:', conversion.jobId)

      // Subscribe to progress
      subscribeToProgress(conversion.jobId, Number(pointCloud.id))
    } catch (error) {
      console.error('Error uploading point cloud:', error)
      
      alert(
        error instanceof Error
          ? `Failed to upload: ${error.message}`
          : 'Failed to upload point cloud'
      )
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
                    options={['view', 'delete', 'info']}
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
