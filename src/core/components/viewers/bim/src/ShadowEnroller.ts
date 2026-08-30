// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { CurrentWorld } from './CurrentWorld'
import { readBimLighting, refreshSunPlacement } from './lib/bimLighting'
import { modelBounds } from './lib/modelBounds'

import type * as FRAGS from '@thatopen/fragments'
import type * as THREE from 'three'

type OnDemandRenderer = OBC.BaseRenderer & { needsUpdate: boolean }

const SUN_REPLACE_DELAY_MS = 250

/**
 * Fragments builds its tile meshes with three's shadow flags off, so a shadowed scene renders
 * no shadows at all. This enrols every tile as it streams in, for every load path.
 */
export class ShadowEnroller extends OBC.Component implements OBC.Disposable {
    static readonly uuid = '0f2a7ad4-2c2f-4c2c-9d3a-6b0a6f5c4a11' as const

    readonly onDisposed = new OBC.Event()

    enabled = true

    private readonly watched = new Set<FRAGS.FragmentsModel>()

    private replaceHandle: ReturnType<typeof setTimeout> | null = null

    constructor(components: OBC.Components) {
        super(components)
        components.add(ShadowEnroller.uuid, this)

        const fragments = components.get(OBC.FragmentsManager)
        for (const [, model] of fragments.list) this.watch(model)
        fragments.list.onItemSet.add(this.onModelSet)
    }

    /** Keeps a helper out of the shadow pass without hiding it, the way the grid needs. */
    excludeFromShadows(object: THREE.Object3D) {
        object.traverse(child => {
            child.castShadow = false
            child.receiveShadow = false
        })
    }

    dispose() {
        if (this.replaceHandle) clearTimeout(this.replaceHandle)
        this.replaceHandle = null
        const fragments = this.components.get(OBC.FragmentsManager)
        fragments.list.onItemSet.remove(this.onModelSet)
        for (const model of this.watched) {
            model.tiles.onItemSet.remove(this.onTileSet)
        }
        this.watched.clear()
        this.onDisposed.trigger()
        this.onDisposed.reset()
    }

    private readonly onModelSet = ({ value }: { value: FRAGS.FragmentsModel }) => {
        this.watch(value)
    }

    private readonly onTileSet = ({ value }: { value: THREE.Object3D }) => {
        if (!this.enabled) return
        this.enrol(value)
        this.refresh()
    }

    private watch(model: FRAGS.FragmentsModel) {
        if (this.watched.has(model)) return
        this.watched.add(model)
        for (const [, tile] of model.tiles) this.enrol(tile)
        model.tiles.onItemSet.add(this.onTileSet)
        this.refresh()
    }

    private enrol(object: THREE.Object3D) {
        object.castShadow = true
        object.receiveShadow = true
    }

    // The sun is framed on the model box, so it has to be re-placed once geometry actually arrives.
    private refresh() {
        const world = this.components.get(CurrentWorld).world
        const renderer = world?.renderer as OnDemandRenderer | undefined
        if (renderer) renderer.needsUpdate = true

        if (this.replaceHandle) clearTimeout(this.replaceHandle)
        this.replaceHandle = setTimeout(() => {
            this.replaceHandle = null
            const current = this.components.get(CurrentWorld).world
            refreshSunPlacement(current, modelBounds(this.components), readBimLighting(current))
        }, SUN_REPLACE_DELAY_MS)
    }
}
