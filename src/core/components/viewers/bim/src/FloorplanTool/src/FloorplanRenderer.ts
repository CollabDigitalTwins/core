// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins


import {
  CategoryHighlighter
} from '../../lib/CategoryHighlighter'

import {
  CUT_COLOR,
  FILL_COLOR,
  FLOORPLAN_CUT_CATEGORIES,
  FLOORPLAN_FILL_CATEGORIES,
  FLOORPLAN_FURNISHING_CATEGORIES,
} from './types'

import type { StoreyProjector } from './StoreyProjector'
import type {
  FloorplanEntry} from './types';
import type {
  ResolveContext,
  StageEmitter} from '../../lib/CategoryHighlighter';
import type * as OBC from '@thatopen/components'

export type RenderStage = 'resolve' | 'cull' | 'switching' | 'cut' | 'fill'

/** Paints a storey's cut group, then its fill group last, so an item matching both ends up filled. */
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
          categories: [...FLOORPLAN_FILL_CATEGORIES, ...FLOORPLAN_FURNISHING_CATEGORIES],
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

  setCutColor(entryKey: string, color: number) {
    return this._highlighter.reapplyGroupColor(entryKey, 0, color)
  }

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
