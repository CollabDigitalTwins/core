// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export const openPopupWindow = (file: File) => {
  const width = Math.floor(screen.width * 0.8)
  const height = Math.floor(screen.height * 0.8)
  const left = Math.floor((screen.width - width) / 2)
  const top = Math.floor((screen.height - height) / 2)

  const scale = 0.9

  const windowFeatures = `
    width=${width * scale},
    height=${height * scale},
    left=${left},
    top=${top},
      resizable=yes,
      scrollbars=yes,
      status=no,
      location=no,
      toolbar=no,
      menubar=no
    `.replaceAll(/\s/g, '')

  // Create object URL from file
  const fileUrl = URL.createObjectURL(file)

  // Determine file type from MIME type and extension
  const getFileType = (file: File): string => {
    // First check MIME type
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type === 'application/pdf') return 'pdf'

    // Fall back to extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return 'image'
      case 'mp4':
      case 'webm':
      case 'ogg':
      case 'avi':
      case 'mov':
        return 'video'
      case 'pdf':
        return 'pdf'
      default:
        return 'iframe'
    }
  }

  const detectedType = getFileType(file)
  const title = file.name || 'CDT - File Viewer'

  const newWindow = window.open('', '_blank', windowFeatures)

  if (newWindow) {
    let content = ''

    switch (detectedType) {
      case 'image':
        content = `<img src="${fileUrl}" alt="${file.name}" />`
        break
      case 'video':
        content = `
                  <video controls autoplay style="max-width: 100%; max-height: 100%;">
                    <source src="${fileUrl}" type="${file.type || 'video/mp4'}">
                    Your browser does not support the video tag.
                  </video>`
        break
      case 'pdf':
        content = `<iframe src="${fileUrl}" style="width: 100%; height: 100%; border: none;"></iframe>`
        break
      default:
        content = `<iframe src="${fileUrl}" style="width: 100%; height: 100%; border: none;"></iframe>`
    }

    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: ${detectedType === 'pdf' ? 'hidden' : 'auto'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background-color: #f5f5f5;
                    }
                    img {
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                    }
                    video {
                        max-width: 100%;
                        max-height: 100%;
                    }
                    iframe {
                        width: 100%;
                        height: 100%;
                        border: none;
                    }
                </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
        `)
    newWindow.document.close()

    // Clean up object URL when window is closed
    newWindow.addEventListener('beforeunload', () => {
      URL.revokeObjectURL(fileUrl)
    })
  }
}
