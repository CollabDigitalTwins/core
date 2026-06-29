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

export function useCaptureScreenshot(): () => Promise<string | null> {
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  const { state: bimState } = React.useContext(BimContext)
  const { world } = bimState.bim

  return React.useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        if (currentViewer === ViewerNames.map && map) {
          map.once('render', () => {
            map.getCanvas().toBlob(async (blob: Blob | null) => {
              resolve(blob ? await blobToBase64(blob) : null)
            }, 'image/png', 1.0)
          })
          map.triggerRepaint()
          return
        }

        if (currentViewer === ViewerNames.bim && world?.renderer && world?.scene && world?.camera) {
          world.renderer.three.render(world.scene.three, world.camera.three)
          const canvas = document.querySelector<HTMLCanvasElement>('#bim-viewer-container canvas')
          if (canvas) {
            canvas.toBlob(async (blob: Blob | null) => {
              resolve(blob ? await blobToBase64(blob) : null)
            }, 'image/png', 1.0)
            return
          }
        }

        let canvas: HTMLCanvasElement | null = null
        if (currentViewer === ViewerNames.pointcloud) {
          canvas = document.querySelector<HTMLCanvasElement>('#pointcloud-viewer-container canvas')
        } else {
          canvas = document.querySelector<HTMLCanvasElement>('canvas')
        }

        if (!canvas) { resolve(null); return }
        canvas.toBlob(async (blob: Blob | null) => {
          resolve(blob ? await blobToBase64(blob) : null)
        }, 'image/png', 1.0)
      } catch {
        resolve(null)
      }
    })
  }, [currentViewer, map, world])
}
