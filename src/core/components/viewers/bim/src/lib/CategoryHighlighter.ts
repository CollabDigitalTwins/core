import * as OBC from '@thatopen/components'
import * as THREE from 'three'

export interface CategoryGroup {
  /** IFC category regexes that match items in this group (e.g. /IFCSLAB/). */
  categories: RegExp[]
  /** Material color used to highlight matched items. */
  color: number
  /** Optional progress stage name emitted before this group is applied.
   *  The UI layer is responsible for translating it to a message. */
  stage?: string
}

export interface CategoryHighlighterConfig {
  /** Groups applied in order. The first group is "fill", subsequent are
   *  "cut" / "outline" etc. — naming is up to the caller. */
  groups: CategoryGroup[]
}

export interface ResolveContext {
  modelId: string
  /** When set, restrict matched ids to this set (e.g. items in a specific
   *  storey). Pass `null` to leave the result unfiltered. */
  filterIds?: Set<number> | null
}

interface ResolvedGroupIds {
  /** ids per group, parallel to config.groups */
  groupIds: number[][]
}

interface ResolvedModel {
  modelId: string
  model: any
  resolved: ResolvedGroupIds
}

export type StageEmitter = (stage: string) => void

const HIGHLIGHT_BASE = {
  opacity: 1,
  transparent: false,
  renderedFaces: 1,
  preserveOriginalMaterial: false,
} as const

const STAGE_RESOLVE = 'resolve'
const STAGE_CULL = 'cull'
const STAGE_SWITCHING = 'switching'

/**
 * Hides everything in every loaded model, then re-shows + colors a
 * configurable set of category groups (e.g. fill = slabs/roofs in white,
 * cut = walls/columns in dark gray). Caches resolved ids per
 * (entry-key × modelId) so repeat activations skip getItemsOfCategories.
 *
 * Replaces the floorplan-specific FloorplanRenderer; reused by both
 * FloorplanTool and ElevationsTool with different category groups.
 */
export class CategoryHighlighter {
  private _renderedModelIds: string[] = []
  private _activeKey: string | null = null
  /** entryKey → modelId → ids per group */
  private _idCache = new Map<string, Map<string, ResolvedGroupIds>>()

  constructor(
    private components: OBC.Components,
    private config: CategoryHighlighterConfig,
  ) {}

  /**
   * Apply the highlighter for the given entry. `entryKey` identifies the
   * cache slot (so two activations of the same entry are cheap); `resolve`
   * is called per loaded model to optionally provide a storey/region
   * filter.
   */
  async apply(
    entryKey: string,
    resolveCtx: (modelId: string, model: any) => Promise<ResolveContext>,
    onStage?: StageEmitter,
  ): Promise<void> {
    const fragments = this.components.get(OBC.FragmentsManager)
    const isFirstApply = this._activeKey === null
    const switchingFrom = this._activeKey

    onStage?.(STAGE_RESOLVE)
    const tasks: Promise<ResolvedModel | null>[] = []
    for (const [modelId, model] of fragments.list) {
      tasks.push(this._resolveModel(entryKey, modelId, model, resolveCtx))
    }
    const resolved = (await Promise.all(tasks)).filter(
      (r): r is ResolvedModel => !!r,
    )
    this._renderedModelIds = resolved.map((r) => r.modelId)

    if (isFirstApply) {
      onStage?.(STAGE_CULL)
      await Promise.all(
        resolved.map(({ model }) =>
          this._swallow(() => model.setVisible(undefined, false)),
        ),
      )
    } else if (switchingFrom && switchingFrom !== entryKey) {
      onStage?.(STAGE_SWITCHING)
      const prev = this._idCache.get(switchingFrom)
      if (prev) {
        await Promise.all(
          resolved.map(async ({ modelId, model, resolved: cur }) => {
            const old = prev.get(modelId)
            if (!old) return
            const nextSet = new Set(cur.groupIds.flat())
            const toHide = old.groupIds
              .flat()
              .filter((id) => !nextSet.has(id))
            if (toHide.length > 0) {
              await this._swallow(() => model.setVisible(toHide, false))
            }
          }),
        )
      }
    }

    // Apply each group sequentially so the bar advances stage-by-stage.
    for (let i = 0; i < this.config.groups.length; i++) {
      const group = this.config.groups[i]
      if (group.stage) onStage?.(group.stage)
      const color = new THREE.Color(group.color)
      await Promise.all(
        resolved.map(async ({ model, resolved: cur }) => {
          const ids = cur.groupIds[i]
          if (ids.length === 0) return
          await this._swallow(() => model.setVisible(ids, true))
          await this._swallow(() =>
            model.highlight(ids, { ...HIGHLIGHT_BASE, color }),
          )
        }),
      )
    }

    fragments.core.update(true)
    this._activeKey = entryKey
  }

  async restore(): Promise<void> {
    if (this._renderedModelIds.length === 0) {
      this._activeKey = null
      return
    }
    const fragments = this.components.get(OBC.FragmentsManager)
    const tasks: Promise<unknown>[] = []
    for (const modelId of this._renderedModelIds) {
      const model = fragments.list.get(modelId) as any
      if (!model) continue
      tasks.push(
        Promise.resolve()
          .then(() => model.resetHighlight())
          .catch(() => {}),
      )
      tasks.push(
        Promise.resolve()
          .then(() => model.resetVisible())
          .catch(() => {}),
      )
    }
    await Promise.all(tasks)
    this._renderedModelIds = []
    this._activeKey = null
    fragments.core.update(true)
  }

  /**
   * Re-apply a single group's highlight with a new color without re-resolving
   * ids or changing visibility. Noop if the entry isn't in the cache yet.
   */
  async reapplyGroupColor(
    entryKey: string,
    groupIdx: number,
    color: number,
  ): Promise<void> {
    const perEntry = this._idCache.get(entryKey)
    if (!perEntry) return
    const fragments = this.components.get(OBC.FragmentsManager)
    const threeColor = new THREE.Color(color)
    // Update the config so future activations also use the new color.
    if (this.config.groups[groupIdx]) {
      this.config.groups[groupIdx].color = color
    }
    await Promise.all(
      [...perEntry.entries()].map(async ([modelId, resolved]) => {
        const model = fragments.list.get(modelId) as any
        if (!model) return
        const ids = resolved.groupIds[groupIdx]
        if (!ids || ids.length === 0) return
        await this._swallow(() =>
          model.highlight(ids, { ...HIGHLIGHT_BASE, color: threeColor }),
        )
      }),
    )
    fragments.core.update(true)
  }

  invalidateForModel(modelId: string) {
    for (const perModel of this._idCache.values()) {
      perModel.delete(modelId)
    }
  }

  invalidateForEntry(entryKey: string) {
    this._idCache.delete(entryKey)
  }

  private async _resolveModel(
    entryKey: string,
    modelId: string,
    model: any,
    resolveCtx: (modelId: string, model: any) => Promise<ResolveContext>,
  ): Promise<ResolvedModel | null> {
    let perModel = this._idCache.get(entryKey)
    if (!perModel) {
      perModel = new Map()
      this._idCache.set(entryKey, perModel)
    }
    const cached = perModel.get(modelId)
    if (cached) return { modelId, model, resolved: cached }

    try {
      const ctx = await resolveCtx(modelId, model)
      // Fetch every group's category list in parallel.
      const groupMaps = await Promise.all(
        this.config.groups.map((g) => model.getItemsOfCategories(g.categories)),
      )
      let groupIds = groupMaps.map(
        (m) => Object.values(m).flat() as number[],
      )
      if (ctx.filterIds && ctx.filterIds.size > 0) {
        const filter = ctx.filterIds
        groupIds = groupIds.map((ids) => ids.filter((id) => filter.has(id)))
      }
      const resolved: ResolvedGroupIds = { groupIds }
      perModel.set(modelId, resolved)
      return { modelId, model, resolved }
    } catch (error) {
      console.warn('[CategoryHighlighter] resolve failed:', modelId, error)
      return null
    }
  }

  private _swallow<T>(fn: () => Promise<T> | T): Promise<T | undefined> {
    return Promise.resolve()
      .then(() => fn())
      .catch((e) => {
        console.warn('[CategoryHighlighter] op failed:', e)
        return undefined
      })
  }
}
