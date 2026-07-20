'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

// Utilities
import { Tool } from '../../../types/tools'
import { ViewerNames } from '../../../types/'

// Shadcn components
import {
  DropdownMenuItem,
} from '../DropdownMenu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../Dialog'
import { Input } from '../Input'
import { Button } from '../Button'
import { toast } from 'sonner'

// Icons
import {
  Link,
  ScanQrCode,
  Camera,
  ChevronDown,
} from 'lucide-react'

// Custom components
import QRCodeWithLink from './QRCodeWithLink'
import { ToolbarSubmenu } from '../../ToolbarSubmenu'
import { LoadingSpinner } from '../LoadingSpinner'

import { MenusContext, MapContext, BimContext } from '../../../store'

interface ShareToolSubmenuProps {
  tool: Tool
  constructShareUrl: () => Promise<string>
  translationKey?: string
  dialogTitleKey?: string
}

export const ShareToolSubmenu: React.FC<ShareToolSubmenuProps> = ({
  tool,
  constructShareUrl,
  translationKey = 'ShareTool',
  dialogTitleKey
}) => {
  // Translation

  const t = useTranslations("ShareTool")
  // Get current viewer from context
  const { state: menusState } = React.useContext(MenusContext)
  const { currentViewer } = menusState.menus

  // Get map instance from context
  const { state: mapState } = React.useContext(MapContext)
  const { map } = mapState.map

  const { state: bimState } = React.useContext(BimContext)
  const { world } = bimState.bim

  // route and navigation
  const router = useRouter()
  const pathname = usePathname()

  // sharing
  const [shareUrlLink, setShareUrlLink] = React.useState<string>('')
  const [origin, setOrigin] = React.useState<string>('')

  const [isLoadingShareLink, setIsLoadingShareLink] = React.useState(false)
  const [isLoadingQRCode, setIsLoadingQRCode] = React.useState(false)

  const [qrDialogOpen, setQrDialogOpen] = React.useState(false)

  // screenshot state
  const [screenshotDialogOpen, setScreenshotDialogOpen] = React.useState(false)
  const [screenshotBlob, setScreenshotBlob] = React.useState<Blob | null>(null)
  const [screenshotUrl, setScreenshotUrl] = React.useState<string>('')
  const [screenshotName, setScreenshotName] = React.useState<string>('')
  const [exportFormat, setExportFormat] = React.useState<'png' | 'pdf'>('png')

  // set initial origin and url link
  React.useEffect(() => {
    setOrigin(window.location.origin)
    setShareUrlLink(window.location.origin + pathname)
  }, [pathname])

  // Cleanup screenshot URL when dialog closes
  React.useEffect(() => {
    if (!screenshotDialogOpen && screenshotUrl) {
      URL.revokeObjectURL(screenshotUrl)
      setScreenshotUrl('')
      setScreenshotBlob(null)
    }
  }, [screenshotDialogOpen, screenshotUrl])

  // Get current view information and copy to clipboard
  const handleClickShare = async () => {
    setIsLoadingShareLink(true)
    try {
      const shareUrl = await constructShareUrl()
      const writeToClipBoard = () => {
        try {
          navigator.clipboard.writeText(shareUrl)// this may causes error
        }
        catch {}
      }
      writeToClipBoard()
      router.push(shareUrl, { scroll: false }) // push but do not refresh
    }
    catch (error) {
      console.error('Failed to copy:', error)
    }
    finally {
      setIsLoadingShareLink(false)
    }
    toast.success(t('copySuccess'))
  }

  // Get current view information and show QR dialog
  const handleShareQR = async () => {
    setIsLoadingQRCode(true)
    try {
      const shareUrl = await constructShareUrl()
      setShareUrlLink(shareUrl)
      router.push(shareUrl, { scroll: false }) // push but do not refresh
      setQrDialogOpen(true)
    }
    catch (error) {
      console.error('Failed to generate QR:', error)
    }
    finally {
      setIsLoadingQRCode(false)
    }
  }

  const handleClickScreenshot = async () => {
    try {
      let canvas: HTMLCanvasElement | null = null

      // Access to the map instance for map viewer
      if (currentViewer === ViewerNames.map && map) {
        // Use the map's 'render' event to capture after render completes
        const captureAfterRender = () => {
          const mapCanvas = map.getCanvas()
          mapCanvas.toBlob((blob) => {
            if (!blob) return

            const url = URL.createObjectURL(blob)
            setScreenshotBlob(blob)
            setScreenshotUrl(url)
            setScreenshotName(`screenshot-${currentViewer}-${Date.now()}`)
            setScreenshotDialogOpen(true)
          }, 'image/png', 1.0)
        }

        // Listen for the next render event
        map.once('render', captureAfterRender)
        // Trigger the repaint
        map.triggerRepaint()
        return
      }

      // For BIM viewer, force a render then capture
      if (currentViewer === ViewerNames.bim && world?.renderer && world?.scene && world?.camera) {
        // Force Three.js to render
        world.renderer.three.render(world.scene.three, world.camera.three)

        // Get the canvas and capture immediately after render
        canvas = document.querySelector('#bim-viewer-container canvas')
        if (canvas) {
          canvas.toBlob((blob) => {
            if (!blob) return

            const url = URL.createObjectURL(blob)
            setScreenshotBlob(blob)
            setScreenshotUrl(url)
            setScreenshotName(`screenshot-${currentViewer}-${Date.now()}`)
            setScreenshotDialogOpen(true)
          }, 'image/png', 1.0)
        }
        return
      }

      if (currentViewer === ViewerNames.pointcloud) {
        canvas = document.querySelector('#pointcloud-viewer-container canvas')
      } else {
        // Fallback to first canvas
        canvas = document.querySelector('canvas')
      }

      if (!canvas) {
        throw new Error('No canvas found')
      }
      canvas.toBlob((blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        setScreenshotBlob(blob)
        setScreenshotUrl(url)
        setScreenshotName(`screenshot-${currentViewer}-${Date.now()}`)
        setScreenshotDialogOpen(true)
      }, 'image/png', 1.0)

    } catch (error) {
      console.error('Screenshot failed:', error)
    }
    toast.success(t('ssSuccess'))
  }

  const handleDownloadScreenshot = async () => {
    if (!screenshotUrl) return

    if (exportFormat === 'pdf') {
      const { default: jsPDF } = await import('jspdf')
      const img = new Image()
      img.onload = () => {
        // Calculate dimensions to fit on page while maintaining aspect ratio
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height]
        })
        pdf.addImage(screenshotUrl, 'PNG', 0, 0, img.width, img.height)
        pdf.save(`${screenshotName}.pdf`)
        setScreenshotDialogOpen(false)
      }
      img.src = screenshotUrl
    } else {
      // Download as PNG
      const a = document.createElement('a')
      a.href = screenshotUrl
      a.download = `${screenshotName}.png`
      a.click()
      setScreenshotDialogOpen(false)
    }
  }

  // Check if current viewer supports screenshots
  const canTakeScreenshot = [
    ViewerNames.map,
    ViewerNames.bim,
    ViewerNames.pointcloud
  ].includes(currentViewer as ViewerNames)

  return (
    <ToolbarSubmenu tool={tool}>
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DropdownMenuItem onClick={(e) => { e.preventDefault() }} className="cursor-pointer">
          <DialogTrigger asChild>
            <button onClick={handleShareQR} disabled={isLoadingQRCode} className="flex w-full gap-2 items-center">
              {isLoadingQRCode ? <LoadingSpinner /> : <ScanQrCode size={16} />}
              <span>{isLoadingQRCode ? t('generating') : t('generate')}</span>
            </button>
          </DialogTrigger>
        </DropdownMenuItem>

        <DialogContent className="flex flex-col items-center gap-4 max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {dialogTitleKey === 'map'
                ? t('mapDialogTitle')
                : dialogTitleKey === 'bim'
                ? t('bimDialogTitle')
                : t('pointCloudDialogTitle')}
            </DialogTitle>
          </DialogHeader>
          <QRCodeWithLink title="" urlToShare={shareUrlLink} isLoadingState={isLoadingQRCode} />
        </DialogContent>
      </Dialog>

      {/* Copy to clipboard */}
      <DropdownMenuItem onClick={handleClickShare} disabled={isLoadingShareLink} onSelect={(e) => { e.preventDefault() }} className="cursor-pointer">
        <div className="flex items-center w-full gap-2">
          {isLoadingShareLink ? <LoadingSpinner /> : <Link size={16} />}
          <span>{isLoadingShareLink ? t('copying') : t('copy')}</span>
        </div>
      </DropdownMenuItem>

      {/* Screenshot */}
      {canTakeScreenshot && (
        <Dialog open={screenshotDialogOpen} onOpenChange={setScreenshotDialogOpen}>
          <DropdownMenuItem onClick={(e) => { e.preventDefault() }} className="cursor-pointer">
            <DialogTrigger asChild>
              <button onClick={handleClickScreenshot} className="flex w-full gap-2 items-center">
                <Camera size={16}/>
                <span>{t('ss')}</span>
              </button>
            </DialogTrigger>
          </DropdownMenuItem>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('ssDownload')}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {screenshotUrl && (
                <img
                  src={screenshotUrl}
                  alt="Screenshot preview"
                  className="w-full h-auto"
                />
              )}

              <div className="flex flex-col gap-2">
                <label htmlFor="screenshot-name">
                  {t('fileName')}
                </label>
                <Input
                  id="screenshot-name"
                  value={screenshotName}
                  onChange={(e) => setScreenshotName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="export-format">
                  {t('format')}
                </label>
                <select
                  id="export-format"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'png' | 'pdf')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="png">{t('png')}</option>
                  <option value="pdf">{t('pdf')}</option>
                </select>
              </div>

              <Button onClick={handleDownloadScreenshot}>
                {t('download')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ToolbarSubmenu>
  )
}