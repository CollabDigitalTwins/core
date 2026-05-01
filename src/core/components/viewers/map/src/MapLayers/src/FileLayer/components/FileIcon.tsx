import * as LR from 'lucide-react'
import { LoadingSpinner } from '../../../../../../../../components/ui/LoadingSpinner'

interface FileIconProps {
  mimeType?: string
  extension?: string
  url?: string | null
  size?: number
}

export default function FileIcon({ mimeType, extension, url, size }: FileIconProps) {
  if (extension === 'uploading') {
    return <LoadingSpinner />
  }

  if (mimeType?.startsWith('image/')) {
    if (url) {
      return <img src={url} width={28} height={28} alt="File preview" className="rounded object-cover" />
    }
    return <LR.Image size={size} />
  }
  if (mimeType?.startsWith('video/')) {
    return <LR.Video size={size} />
  }
  if (mimeType === 'application/pdf') {
    return <LR.FileText size={size} />
  }
  // if (mimeType?.startsWith('model/')) {
  //   return <LR.Box size={size} />
  // }

  // using extension for fall back
  const ext = extension?.toLowerCase()
  switch (ext?.toLowerCase()) {
    // documents
    case 'doc':
    case 'docx':
    case 'rtf':
      return <LR.FileText size={size} />

    // spreadsheets
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'dbf':
      return <LR.FileSpreadsheet size={size} />

    // presentations
    case 'ppt':
    case 'pptx':
      return <LR.Presentation size={size} />

    // archives
    case 'zip':
    case 'rar':
    case '7z':
      return <LR.Archive size={size} />

    // plain text
    case 'txt':
      return <LR.FileText size={size} />

    // PDF
    case 'pdf':
      return <LR.FileText size={size} />

    // images
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return <LR.Image size={size} />

    // videos
    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
    case 'mkv':
      return <LR.Video size={size} />

    // audio
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
    case 'flac':
      return <LR.Music size={size} />

    // 3D models
    case 'glb':
    case 'gltf':
    case 'obj':
    case 'fbx':
    case 'stl':
    case '3ds':
    case 'ply':
    case 'ifc':
    case 'rvt':
    case 'dae':
    case 'dxf':
    case 'dwg':
      return <LR.Box size={size} />

    // GIS vectors and sidecars
    case 'shp':
    case 'shx':
    case 'prj':
    case 'cpg':
    case 'geojson':
      return <LR.Map size={size} />

    // energy files
    case 'h2k':
      return <LR.Zap size={size} />

    // points clouds
    case 'laz':
    case 'las':
      return <LR.Grip size={size} />

    // fallback
    default:
      return <LR.File size={size} />
  }
}
