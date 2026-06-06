import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { uploadFile as performUploadFile } from '../../uploadFile'

import { getFileExtension } from '../../../../utils/utils'
import { useBuilding } from '../../../../hooks/buildings/buildings'

// @thatopen/IfcToFragments are imported dynamically in the IFC branch below
// (not statically) to keep ~456 KB out of the eager bundle.

interface UseFileUploadHandlerProps {
  buildingId: number
  tag?: string
  isVisible?: boolean
  uploadFile: (args: { fileData: any, buildingId: number }) => Promise<any>
  onFileUpload?: () => void
  onUploadStart?: () => void
  onUploadEnd?: () => void
  customMessages?: {
    success?: string
    errorPrefix?: string
    errorSuffix?: string
    noIdError?: string
  }
}

interface FileUploadHandler {
  handleFileUpload: (file: File | null) => Promise<void>
  handleInputFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  isUploading: boolean
}

export function useFileUploadHandler({
  buildingId,
  tag,
  isVisible,
  uploadFile,
  onFileUpload,
  onUploadStart,
  onUploadEnd,
  customMessages,
}: UseFileUploadHandlerProps): FileUploadHandler {
  const { data: session } = useSession()
  const user = session?.user
  const t = useTranslations('useFileUploadHandler')
  const { building } = useBuilding(buildingId)

          // Inherit building position for the uploaded fragment file
        const position = building ? {
          lng: building.buildingLongitude,
          lat: building.buildingLatitude,
          rotation: building.rotation ?? 0,
          elevation: building.buildingElevation ?? 0,
        } : undefined

  const handleFileUpload = async (file: File | null) => {
    if (!file) return

    if (!buildingId) {
      const errorMsg = customMessages?.noIdError || t('noBuildingId')
      toast.error(errorMsg)
      return
    }

    onUploadStart?.()
    
    try {
      const ext = getFileExtension(file)?.toLowerCase()

      if (ext === 'ifc') {
        const { convertIfcToFragmentsFile } = await import('./convertIfcToFragmentsFile')
        const fragFile = await convertIfcToFragmentsFile(file)

        await performUploadFile({
          // files: [file, fragFile], // Upload both IFC and fragments
          files: [fragFile], // Upload only fragments
          buildingId: buildingId || 0,
          tag,
          isVisible,
          user,
          uploadFile,
          position: { ...position },
        })

        const successMsg = customMessages?.success || t('uploadSuccess', { count: 2 })
        toast.success(successMsg)
      } else {
        // Non-IFC: upload as-is
        await performUploadFile({
          file,
          buildingId: buildingId || 0,
          tag,
          user,
          uploadFile,
          isVisible,
          position: position !== undefined || isVisible !== undefined ? { ...position } : undefined,
        })

        const successMsg = customMessages?.success || t('uploadSuccess', { count: 1 })
        toast.success(successMsg)
      }
      
      if (typeof onFileUpload === 'function') {
        onFileUpload()
      }
    } catch (error) {
      const errorPrefix = customMessages?.errorPrefix || t('uploadError')
      const errorSuffix = customMessages?.errorSuffix || t('unknownError')
      const errorMsg = `${errorPrefix} ${error instanceof Error ? error.message : errorSuffix}`
      toast.error(errorMsg)
    } finally {
      onUploadEnd?.()
    }
  }

  const handleInputFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    await handleFileUpload(file)
    e.target.value = '' // Reset input to allow uploading the same file again
  }

  return {
    handleFileUpload,
    handleInputFileChange,
    isUploading: false // This could be enhanced with actual loading state if needed
  }
}
