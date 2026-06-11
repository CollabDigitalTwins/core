
export async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

export async function uploadOrganizationLogoToPublicBucket(file: File): Promise<string> {
  const presignedUrlResult = await fetch(`/api/presigned-url-upload?asset=${encodeURIComponent(file.name)}&bucket=org-logos`)
  if (!presignedUrlResult.ok) throw new Error('Failed to get presigned URL for org logo')
  const { presignedUrl, key } = await presignedUrlResult.json()

  const uploadResult = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })
  if (!uploadResult.ok) throw new Error('Failed to upload organization logo')

  return key
}
