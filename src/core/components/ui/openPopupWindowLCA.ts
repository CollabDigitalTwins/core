// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

export const openPopupWindow = () => {
  const height = Math.floor(screen.height * 0.8)
  const width = Math.floor(height * (1180 / 776))
  const left = Math.floor((screen.width - width) / 2)
  const top = Math.floor((screen.height - height) / 2)

  const windowFeatures = `
    width=${width},
    height=${height},
    left=${left},
    top=${top},
      resizable=yes,
      scrollbars=yes,
      status=no,
      location=no,
      toolbar=no,
      menubar=no
    `.replaceAll(/\s/g, '')

  const newWindow = window.open('', '_blank', windowFeatures)

  if (newWindow) {
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
      <title>CDT - LCA Tool</title>
      <style>
        body, html {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f5f5f5;
        }
        video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        }
      </style>
        </head>
        <body>
      <video controls autoplay muted>
        <source src="./themes/dnd/nrc-lca-popup.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
        </body>
      </html>
      `)
    newWindow.document.close()
  }
}
