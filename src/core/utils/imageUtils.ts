
export async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

export async function uploadOrganizationLogoToPublicBucket(file: File): Promise<string> {
  const uploadUrl = `${process.env.NEXT_PUBLIC_MINIO_BUCKET_URL}/org-logos/${file.name}`
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  })

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload organization logo')
  }

  return file.name
}
