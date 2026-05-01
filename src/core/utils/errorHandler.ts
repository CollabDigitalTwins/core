import { toast } from 'sonner'

export function handleApiError(error: any) {
  if (error?.status === 401) {
    toast.error('Permission denied')
    return true
  }
  return false
}