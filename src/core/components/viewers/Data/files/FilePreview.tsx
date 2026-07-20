// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Dependencies
import { useTranslations } from 'next-intl'
import React from 'react'

// Shadcn Components
import { Card, CardContent } from '../../../../components/ui/Card'
import {DialogContent, DialogTitle, DialogTrigger } from '../../../../components/ui/Dialog'

// Icons
import * as LR from 'lucide-react'
import type { DbFile } from '../../../../types/dbTypes'
import { ViewerNames } from '../../../../types/'
import { MenusContext, BimContext } from '../../../../store'
import { IfcIcon } from '../../../ui/Icons'
import { BimViewer } from '../../bim/BimViewer'
import { SimpleBimViewer } from '../../bim/src/SimpleBimViewer'

interface FilePreviewProps {
  file: {
    metadata: DbFile
  }
  showTrigger?: boolean
  disableDialogFor3D?: boolean
}

export default function FilePreview({ file, showTrigger = true, disableDialogFor3D = false }: FilePreviewProps) {
  // Translations
  const t = useTranslations('FilePreview')

  const ext = file?.metadata?.extension?.toLowerCase()
  const isVideo = ext === 'mp4'
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)
  const isPDF = ext === 'pdf'
  const isPowerPoint = ['ppt', 'pptx'].includes(ext)
  const isExcel = ['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'].includes(ext)
  const isWordDoc = ['doc', 'docx'].includes(ext)
  const is3dModel = ['gltf', 'glb', 'fbx', 'obj', 'collada'].includes(ext)
  const isBIM = ['ifc', 'frag'].includes(ext)

  const source = file?.metadata?.url

    const previewHeight= '500px'

  const previewComponent = () => {
    switch (true) {
      case isVideo:
        return (
          <video
            controls
            className="w-full h-full object-contain"
            src={source}
            title={file?.metadata?.name}
          >
            {t('noSupport')}
          </video>
        )
      case isImage:
        return (
          <img
            src={source}
            alt={file?.metadata?.name ?? t('imageAlt')}
            className="w-full h-full object-contain"
          />
        )

      case isPDF:
        return (
          <div className="flex flex-col items-center text-muted-foreground font-semibold">
            <LR.FileText className="mb-2" size={32} />
            {t('pdfFiletext')}
          </div>
        )
      case isPowerPoint:
        return (
          <div className="flex flex-col items-center text-muted-foreground font-semibold">
            <LR.FileText className="mb-2" size={32} />
            {t('pptFiletext')}
          </div>
        )
      case isExcel:
        return (
          <div className="flex flex-col items-center text-muted-foreground font-semibold">
            <LR.FileSpreadsheet className="mb-2" size={32} />
            {t('xlsxFiletext')}
          </div>
        )
      case isWordDoc:
        return (
          <div className="flex flex-col items-center text-muted-foreground font-semibold">
            <LR.FileSpreadsheet className="mb-2" size={32} />
            {t('wordFiletext')}
          </div>
        )
      case is3dModel:
      case isBIM:
        return (
        <SimpleBimViewer file={file.metadata} height={previewHeight} />
        )
      default:
        return (
          <div className="flex flex-col items-center text-muted-foreground font-semibold">
            <LR.FileText className="mb-2" size={32} />
            {t('noPreview')}
          </div>
        )
    }
  }

  return (
    <>
      {showTrigger && (
        <>
          {(isBIM || is3dModel) && disableDialogFor3D ? (
            <Card className="pointer-events-auto w-full h-auto">
              <CardContent className={`overflow-hidden flex justify-center items-center p-0 rounded-t-xl bg-muted w-full h-[${previewHeight}]`}>
                {previewComponent()}
              </CardContent>
            </Card>
          ) : (
            <DialogTrigger asChild title={`${t('previewFile')}`}>
              <Card className="pointer-events-auto w-full h-auto">
                <CardContent className={`overflow-hidden flex justify-center items-center p-0 rounded-t-xl bg-muted w-full h-[${previewHeight}]`}>
                  {previewComponent()}
                </CardContent>
              </Card>
            </DialogTrigger>
          )}
        </>
      )}
        <>
          <DialogTitle className="hidden">{t('title')}</DialogTitle>
          <DialogContent className="w-auto p-0 h-screen sm:max-w-[95vw] sm:h-[90vh] flex justify-center items-center" closeClass="hidden">
            {(isPowerPoint || isExcel || isWordDoc) ? (
              <iframe
                className="max-w-screen h-screen sm:max-w-[95vw] sm:h-[90vh] aspect-square pointer-events-auto rounded-xl"
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(source)}`}
                title={`${isPowerPoint ? t('pptTitle') : t('xlsxTitle')} ${t('preview')}`}
                style={{ border: 'none' }}
              />
            ) : (isBIM || is3dModel) ? (
              <SimpleBimViewer file={file.metadata} height="65vh" width='60vw' />
            ) : (
              <iframe
                className="max-w-screen h-screen sm:max-w-[95vw] sm:h-[90vh] aspect-square pointer-events-auto rounded-xl"
                src={source}
                title={t('filePreview')}
                style={{ border: 'none' }}
              />
            )}
          </DialogContent>
        </>
    </>
  )
}
