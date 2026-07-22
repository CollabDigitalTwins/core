// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { CurrentWorld } from './CurrentWorld';

export class ClippingPlane extends OBC.Component {

    static readonly uuid = '29b2eabd-36cd-4b42-a62c-d0509bd67d60' as const

    private _enabled = false
    private clipper: OBC.Clipper
    private casters: OBC.Raycasters
    private world: OBC.World | null = null
    private container: HTMLElement | null = null

    get enabled() {
        return this._enabled
    }

    set enabled(value: boolean) {
        this._enabled = value
        this.clipper.enabled = value

        if (value) {
            this.setupClippingPlane()
        } else {
            this.removeEventListeners()
        }
    }

    constructor(components: OBC.Components) {
        super(components)
        components.add(ClippingPlane.uuid, this)

        // Initialize clipper and raycasters
        this.clipper = components.get(OBC.Clipper)
        this.casters = components.get(OBC.Raycasters)
        this.world = components.get(CurrentWorld).world

        // Initialize the raycaster for the world
        if (this.world) {
            this.casters.get(this.world)
        }

        // Get the container from the world's renderer
        if (this.world?.renderer?.three.domElement.parentElement) {
            this.container = this.world.renderer.three.domElement.parentElement
        }
    }

    private setupClippingPlane() {
        if (!this.world || !this.container) {
            console.warn('World and container must be set before enabling clipping plane')
            return
        }

        // Add double-click event listener to create clipping planes
        this.container.ondblclick = () => {
            if (this.enabled && this.world) {
                this.clipper.create(this.world)
            }
        }

        // Make container focusable and focused for keyboard events
        this.container.tabIndex = -1
        this.container.focus()

        // Add keyboard event listener for deleting clipping planes
        this.container.addEventListener('keydown', this.handleKeyDown)
        // Also add to window as fallback
        window.addEventListener('keydown', this.handleKeyDown)
    }

    private removeEventListeners() {
        if (this.container) {
            this.container.ondblclick = null
            this.container.removeEventListener('keydown', this.handleKeyDown)
        }
        window.removeEventListener('keydown', this.handleKeyDown)
    }

    private handleKeyDown = (event: KeyboardEvent) => {
        if (event.code === "Delete" || event.code === "Backspace" || event.code === "Escape") {
            if (this.enabled && this.world) {
                event.preventDefault();
                event.stopPropagation();
                this.deletePlanes()
            }
        }
    }

    createPlanes() {
        if (this.enabled && this.world) {
            this.clipper.create(this.world)
        }
    }

    deletePlanes() {
        if (this.world) {
            this.clipper.deleteAll()
        }
    }

    dispose() {
        this.enabled = false
        this.removeEventListeners()
        this.world = null
        this.container = null
    }
}