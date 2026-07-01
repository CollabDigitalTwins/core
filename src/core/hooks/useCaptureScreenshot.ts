'use client'

import * as React from 'react'
import { MenusContext, MapContext, BimContext } from '../store'
import { ViewerNames } from '../types'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function useCaptureScreenshot(): () => Promise<string | null> {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  const { state: bimState } = React.useContext(BimContext)
  const { world } = bimState.bim

  return React.useCallback((): Promise<string | null> => {
    const capture = async (): Promise<string | null> => {
      let viewerDataUrl: string | null = null
      let viewerBounds: DOMRect | null = null
      let viewerCanvasElement: HTMLCanvasElement | null = null

      // WebGL canvases clear their back-buffer after each frame, so we must
      // read them synchronously at the exact moment they have valid content —
      // before yielding to the event loop for html2canvas.
      if (currentViewer === ViewerNames.map && map) {
        await new Promise<void>((res) => {
          map.once('render', () => {
            const canvas = map.getCanvas()
            viewerCanvasElement = canvas
            viewerBounds = canvas.getBoundingClientRect()
            try { viewerDataUrl = canvas.toDataURL('image/png') } catch { /* cross-origin taint */ }
            res()
          })
          map.triggerRepaint()
        })
      } else if (currentViewer === ViewerNames.bim && world?.renderer && world?.scene && world?.camera) {
        world.renderer.three.render(world.scene.three, world.camera.three)
        const canvas = document.querySelector<HTMLCanvasElement>('#bim-viewer-container canvas')
        if (canvas) {
          viewerCanvasElement = canvas
          viewerBounds = canvas.getBoundingClientRect()
          try { viewerDataUrl = canvas.toDataURL('image/png') } catch { /* ignore */ }
        }
      } else {
        const canvas = currentViewer === ViewerNames.pointcloud
          ? document.querySelector<HTMLCanvasElement>('#pointcloud-viewer-container canvas')
          : document.querySelector<HTMLCanvasElement>('canvas')
        if (canvas) {
          viewerCanvasElement = canvas
          viewerBounds = canvas.getBoundingClientRect()
          try { viewerDataUrl = canvas.toDataURL('image/png') } catch { /* ignore */ }
        }
      }

      // Capture the full DOM — sidebar, toolbar, all UI panels — but skip the
      // viewer canvas (we have its pixels already; html2canvas can't read WebGL).
      const { default: html2canvas } = await import('html2canvas')
      const uiCanvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        removeContainer: true,
        scale: window.devicePixelRatio || 1,
        ignoreElements: (el) => el === viewerCanvasElement,
      })

      // Draw the pre-captured viewer image into the blank region.
      if (viewerDataUrl && viewerBounds) {
        const ctx = uiCanvas.getContext('2d')
        if (ctx) {
          try {
            const img = await loadImage(viewerDataUrl)
            const dpr = window.devicePixelRatio || 1
            ctx.drawImage(
              img,
              viewerBounds.left * dpr,
              viewerBounds.top * dpr,
              viewerBounds.width * dpr,
              viewerBounds.height * dpr,
            )
          } catch { /* skip compositing on error */ }
        }
      }

      return new Promise<string | null>((resolve) => {
        uiCanvas.toBlob((blob) => {
          if (!blob) { resolve(null); return }
          blobToBase64(blob).then(resolve)
        }, 'image/png', 1.0)
      })
    }

    return capture().catch(() => null)
  }, [currentViewer, map, world])
}
