// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { BcfIcon, IdsIcon, IfcIcon } from '../components/ui/Icons/'

import { iconForFile } from './fileIconsUtils'

describe('iconForFile, by what the file is', () => {
  it('reads a kind the extension cannot tell, such as a converted point cloud', () => {
    expect(iconForFile({ type: 'point-cloud-file' })).toBe(LR.Grip)
  })

  it('gives every BIM file the IFC mark', () => {
    expect(iconForFile({ extension: 'ifc' })).toBe(IfcIcon)
    expect(iconForFile({ extension: 'frag' })).toBe(IfcIcon)
  })

  it('gives a loaded model the axis mark, not the box the BIM section uses', () => {
    expect(iconForFile({ extension: 'glb' })).toBe(LR.FileAxis3d)
    expect(iconForFile({ extension: 'fbx' })).toBe(LR.FileAxis3d)
  })

  it('gives a drawing the drafting mark rather than a model one', () => {
    expect(iconForFile({ extension: 'dxf' })).toBe(LR.DraftingCompass)
    expect(iconForFile({ extension: 'dwg' })).toBe(LR.DraftingCompass)
  })

  it('reads point clouds and splats by kind, whatever the extension', () => {
    expect(iconForFile({ extension: 'e57' })).toBe(LR.Grip)
    expect(iconForFile({ extension: 'laz' })).toBe(LR.Grip)
    expect(iconForFile({ extension: 'spz' })).toBe(LR.Sparkles)
  })
})

describe('iconForFile, by extension', () => {
  it('knows the openBIM sidecars', () => {
    expect(iconForFile({ extension: 'ids' })).toBe(IdsIcon)
    expect(iconForFile({ extension: 'bcf' })).toBe(BcfIcon)
  })

  it('gives a spreadsheet the spreadsheet mark', () => {
    expect(iconForFile({ extension: 'xlsx' })).toBe(LR.FileSpreadsheet)
    expect(iconForFile({ extension: 'csv' })).toBe(LR.FileSpreadsheet)
    expect(iconForFile({ extension: 'dbf' })).toBe(LR.FileSpreadsheet)
  })

  it('keeps the kinds only the map knew: GIS vectors and an energy file', () => {
    expect(iconForFile({ extension: 'geojson' })).toBe(LR.Map)
    expect(iconForFile({ extension: 'shp' })).toBe(LR.Map)
    expect(iconForFile({ extension: 'h2k' })).toBe(LR.Zap)
  })

  it('covers the media the two lists each knew half of', () => {
    expect(iconForFile({ extension: 'mkv' })).toBe(LR.Video)
    expect(iconForFile({ extension: 'avi' })).toBe(LR.Video)
    expect(iconForFile({ extension: 'flac' })).toBe(LR.Music)
    expect(iconForFile({ extension: 'mp3' })).toBe(LR.Music)
    expect(iconForFile({ extension: 'svg' })).toBe(LR.Image)
    expect(iconForFile({ extension: '7z' })).toBe(LR.Archive)
    expect(iconForFile({ extension: 'rtf' })).toBe(LR.FileText)
    expect(iconForFile({ extension: 'pptx' })).toBe(LR.Presentation)
  })

  it('reads an extension whatever its case', () => {
    expect(iconForFile({ extension: 'PDF' })).toBe(LR.FileText)
  })
})

describe('iconForFile, by mime type', () => {
  it('falls back to the media family when there is no extension to read', () => {
    expect(iconForFile({ mimeType: 'image/webp' })).toBe(LR.Image)
    expect(iconForFile({ mimeType: 'video/quicktime' })).toBe(LR.Video)
    expect(iconForFile({ mimeType: 'audio/aac' })).toBe(LR.Music)
    expect(iconForFile({ mimeType: 'application/pdf' })).toBe(LR.FileText)
  })

  it('prefers what the extension says over the family', () => {
    expect(iconForFile({ extension: 'ifc', mimeType: 'application/octet-stream' })).toBe(IfcIcon)
  })

  it('falls back to the plain file mark when nothing is recognized', () => {
    expect(iconForFile({ extension: 'wat' })).toBe(LR.File)
    expect(iconForFile({})).toBe(LR.File)
  })
})
