import { Modified, Position } from './global'
import { Group, Privacy, Visibility } from './users'
import type { DbFile } from '../../core/types/dbTypes'

export interface IMedia extends Modified {
  code?: string // Media code: fileName-Viewer-user-x_y_z or fileName-Viewer-user-lat_lng
  type: string // MediaType;
  position: Position // latlng if in map and x,y,z if in Three
  rotation?: number
  scale?: number
  assetId?: string
  comment?: string
  file?: DbFile
  fileUrl?: string
  fileExtension?: string
  visibility?: Visibility
  groups?: Group[]
  submitted?: boolean
  privacy?: Privacy
}

export type FileRow = {
  // rendering data
  id: string
  name: string
  attachedTo: (
    { type: 'building', buildingId: string }
    | { type: 'site', siteId: string }
  )[]
  dateUploaded: string | Date
  uploadedBy: string
  fileType: string
  fileSize: string
  position: Position | string

  // original metadata
  metadata: DbFile
}

export type FileType = 'map-file' | 'bim-file' | 'system' | 'point-cloud-file'
