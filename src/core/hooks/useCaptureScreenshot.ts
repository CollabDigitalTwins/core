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

  return React.useCallback(async (): Promise<string | null> => {
    try {
      let viewerDataUrl: string | null = null
      let viewerCanvas: HTMLCanvasElement | null = null
      let viewerBounds: DOMRect | null = null

      if (currentViewer === ViewerNames.map && map) {
        await Promise.race([
          new Promise<void>((res) => {
            void map.once('render', () => {
              viewerCanvas = map.getCanvas()
              viewerBounds = viewerCanvas.getBoundingClientRect()
              try { viewerDataUrl = viewerCanvas.toDataURL('image/png') } catch { /* cross-origin */ }
              res()
            })
            map.triggerRepaint()
          }),
          new Promise<void>((r) => setTimeout(r, 3000)),
        ])
      } else if (currentViewer === ViewerNames.bim && world?.renderer && world?.scene && world?.camera) {
        world.renderer.three.render(world.scene.three, world.camera.three)
        viewerCanvas = document.querySelector<HTMLCanvasElement>('#bim-viewer-container canvas')
        if (viewerCanvas) {
          viewerBounds = viewerCanvas.getBoundingClientRect()
          try { viewerDataUrl = viewerCanvas.toDataURL('image/png') } catch { /* ignore */ }
        }
      } else {
        const sel = currentViewer === ViewerNames.pointcloud ? '#pointcloud-viewer-container' : null
        viewerCanvas = sel
          ? document.querySelector<HTMLCanvasElement>(`${sel} canvas`)
          : document.querySelector<HTMLCanvasElement>('canvas')
        if (viewerCanvas) {
          viewerBounds = viewerCanvas.getBoundingClientRect()
          try { viewerDataUrl = viewerCanvas.toDataURL('image/png') } catch { /* ignore */ }
        }
      }

      const { default: html2canvas } = await import('html2canvas')

      // Find the dialog portal: walk up from [role="dialog"] to its direct
      // child-of-body ancestor. We hide it with display:none before capture
      // and restore it after. This avoids ignoreElements on a body child,
      // which causes "Unable to find element in cloned iframe".
      let dialogPortal: HTMLElement | null = null
      const dialogEl = document.querySelector('[role="dialog"]')
      if (dialogEl) {
        let node: Element | null = dialogEl
        while (node && node.parentElement !== document.body) {
          node = node.parentElement
        }
        if (node && node !== document.body) dialogPortal = node as HTMLElement
      }

      if (dialogPortal) dialogPortal.style.display = 'none'

      const captureUi = (ignoreImages: boolean) => html2canvas(document.body, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: window.devicePixelRatio || 1,
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        ignoreElements: (el: Element) =>
          el === viewerCanvas || (ignoreImages && el.tagName === 'IMG'),
      })

      let uiCanvas: HTMLCanvasElement
      try {
        try {
          uiCanvas = await captureUi(false)
        } catch (err) {
          // Safari throws "The operation is insecure" when a cross-origin
          // image (org logo, user avatar, ...) taints html2canvas's internal
          // canvas even with allowTaint:false — retry once with all <img>
          // elements excluded so the capture still succeeds, just without
          // those images. Chrome is more lenient here, which is why this
          // only shows up on mobile Safari.
          console.warn('[useCaptureScreenshot] retrying without <img> elements after taint error:', err)
          uiCanvas = await captureUi(true)
        }
      } finally {
        if (dialogPortal) dialogPortal.style.display = ''
      }

      // Composite the pre-captured viewer image at the exact canvas bounds.
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

      return await new Promise<string | null>((resolve) => {
        uiCanvas.toBlob((blob) => {
          if (!blob) { resolve(null); return }
          // Resolve null rather than leaving the promise pending if encoding fails.
          blobToBase64(blob).then(resolve).catch(() => resolve(null))
        }, 'image/png', 1.0)
      })
    } catch (err) {
      console.error('[useCaptureScreenshot] failed:', err)
      throw err instanceof Error ? err : new Error(String(err))
    }
  }, [currentViewer, map, world])
}
