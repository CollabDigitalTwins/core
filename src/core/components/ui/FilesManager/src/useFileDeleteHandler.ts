import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface UseFileDeleteHandlerProps {
  deleteFile: (fileId: number) => Promise<any>
  onDeleteSuccess?: () => void
  onDeleteStart?: () => void
  onDeleteEnd?: () => void
  customMessages?: {
    success?: string
    errorPrefix?: string
    noIdError?: string
  }
}

interface FileDeleteHandler {
  handleDeleteFile: (file: any) => Promise<void>
  isDeleting: boolean
}

export function useFileDeleteHandler({
  deleteFile,
  onDeleteSuccess,
  onDeleteStart,
  onDeleteEnd,
  customMessages
}: UseFileDeleteHandlerProps): FileDeleteHandler {

  const t = useTranslations('useFileDeleteHandler')
    const handleDeleteFile = async (file: any) => {
    try {
      onDeleteStart?.()

      // Get the file ID from the correct location
      const fileId = file.id || file.metadata?.id

      if (!fileId) {
        const errorMsg = customMessages?.noIdError || t('noIdError')
        throw new Error(errorMsg)
      }

      await deleteFile(Number(fileId))

      const fileName = file.name || file.metadata?.name || t('unknownFile')
      const successMsg = customMessages?.success || t('deleteSuccess', { fileName })
      toast.success(successMsg)

      if (typeof onDeleteSuccess === 'function') {
        onDeleteSuccess()
      }
    } catch (error) {
      const errorPrefix = customMessages?.errorPrefix || t('deleteError')
      const errorMessage = error instanceof Error ? error.message : t('unknownError')
      toast.error(`${errorPrefix}: ${errorMessage}`)
      console.error('Delete file error:', error)
    } finally {
      onDeleteEnd?.()
    }
  }

  return {
    handleDeleteFile,
    isDeleting: false // This could be enhanced with actual loading state if needed
  }
}
