// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import {
  CategoryHighlighter,
  ResolveContext,
  StageEmitter,
} from '../../lib/CategoryHighlighter'
import {
  CUT_COLOR,
  FILL_COLOR,
  FloorplanEntry,
  FLOORPLAN_CUT_CATEGORIES,
  FLOORPLAN_FILL_CATEGORIES,
} from './types'
import { StoreyProjector } from './StoreyProjector'

export type RenderStage = 'resolve' | 'cull' | 'switching' | 'cut' | 'fill'

/**
 * Floorplan-flavor wrapper around the generic CategoryHighlighter:
 *  - "cut" stage paints walls / curtain-wall panels & mullions / columns
 *    in dark gray.
 *  - "fill" stage paints slabs / roofs white. Applied LAST so that an item
 *    matched by both groups (e.g. an IFCSLAB encoded with a category that
 *    overlaps the cut regex set) ends up white instead of gray.
 * Per-storey filtering via StoreyProjector's storey-id cache.
 */
export class FloorplanRenderer {
  private _highlighter: CategoryHighlighter

  constructor(
    components: OBC.Components,
    private projector: StoreyProjector,
  ) {
    this._highlighter = new CategoryHighlighter(components, {
      groups: [
        {
          categories: FLOORPLAN_CUT_CATEGORIES,
          color: CUT_COLOR,
          stage: 'cut',
        },
        {
          categories: FLOORPLAN_FILL_CATEGORIES,
          color: FILL_COLOR,
          stage: 'fill',
        },
      ],
    })
  }

  async apply(
    entry: FloorplanEntry,
    onStage?: (stage: RenderStage) => void,
  ) {
    const resolveCtx = async (
      modelId: string,
      model: any,
    ): Promise<ResolveContext> => {
      if (modelId !== entry.modelId) return { modelId }
      const storeyIds = await this.projector.getCachedStoreyIds(
        entry.modelId,
        entry.storeyLocalId,
        model,
      )
      return {
        modelId,
        filterIds: storeyIds.length > 0 ? new Set(storeyIds) : null,
      }
    }
    await this._highlighter.apply(
      entry.id,
      resolveCtx,
      onStage as StageEmitter,
    )
  }

  /** Repaint the CUT group (walls/columns/curtain walls) with a new color.
   *  Updates both the cached highlight and the config for future activations. */
  setCutColor(entryKey: string, color: number) {
    return this._highlighter.reapplyGroupColor(entryKey, 0, color)
  }

  /** Repaint the FILL group (slabs/roofs) with a new color. */
  setFillColor(entryKey: string, color: number) {
    return this._highlighter.reapplyGroupColor(entryKey, 1, color)
  }

  restore() {
    return this._highlighter.restore()
  }

  invalidateForModel(modelId: string) {
    this._highlighter.invalidateForModel(modelId)
  }

  invalidateForEntry(entryId: string) {
    this._highlighter.invalidateForEntry(entryId)
  }
}
