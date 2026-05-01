'use client'

import { DbFile } from '../../../../types/dbTypes'

export async function downloadFile(url: string, file: DbFile) {
  try {    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the blob URL
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('Error downloading file:', error)
    // Fallback to direct download if fetch fails
    const link = document.createElement('a')
    link.href = url
    // Ensure the file name has the correct extension
    const hasExtension = /\.[^.\s]+$/.test(file.name);
    const fileName = hasExtension && file.extension
      ? file.name
      : file.extension
      ? `${file.name}.${file.extension.replace(/^\./, '')}`
      : file.name;
    link.download = fileName;
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export async function downloadDbFile(file: DbFile) {
  await downloadFile(file.url, file)
}

export async function downloadFromUrl(url: string, file: DbFile) {
  await downloadFile(url, file)
}