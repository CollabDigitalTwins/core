// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import { FLOORPLAN_CUT_CATEGORIES } from './types'

const CLASSIFICATION = 'FloorplanCutFill'
const GROUP = 'Cut'
const STYLE = 'FloorplanCut'
const EDGES_ID = 'floorplan-cut-fill'

/** A solid cap over every wall, column and curtain-wall part the plan's section cuts, whatever storey it is filed under. */
export class PlanCutFill {
  private _shown = false
  private _showSeq = 0
  private _material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })

  constructor(private components: OBC.Components) {}

  async show(world: OBC.World, cutY: number, color: number) {
    this.hide()
    const seq = ++this._showSeq
    this._material.color.setHex(color)

    const styler = this.components.get(OBF.ClipStyler)
    styler.world = world
    styler.styles.set(STYLE, { fillsMaterial: this._material })

    await this._fillGroup()
    if (seq !== this._showSeq) return
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), cutY)
    const edges = styler.create(plane, {
      id: EDGES_ID,
      items: { [GROUP]: { style: STYLE, data: { [CLASSIFICATION]: [GROUP] } } },
    })
    edges.visible = true
    this._shown = true
  }

  setColor(color: number) {
    this._material.color.setHex(color)
  }

  hide() {
    this._showSeq++
    if (!this._shown) return
    this.components.get(OBF.ClipStyler).list.delete(EDGES_ID)
    this._shown = false
  }

  dispose() {
    this.hide()
    this._material.dispose()
  }

  private async _fillGroup() {
    const classifier = this.components.get(OBC.Classifier)
    const { map } = classifier.getGroupData(CLASSIFICATION, GROUP)
    for (const modelId of Object.keys(map)) delete map[modelId]
    const fragments = this.components.get(OBC.FragmentsManager)
    for (const [modelId, model] of fragments.list) {
      const byCategory = await model.getItemsOfCategories(FLOORPLAN_CUT_CATEGORIES)
      const ids = Object.values(byCategory).flat()
      if (ids.length > 0) classifier.addGroupItems(CLASSIFICATION, GROUP, { [modelId]: new Set(ids) })
    }
  }
}
