// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as OBF from '@thatopen/components-front'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'

export class LengthMeasurement extends OBC.Component {

    static readonly uuid = "5f8da1b7-6023-4a21-acc7-569127cdde54" as const

    enabled = false

    private measurer: OBF.LengthMeasurement | null = null

    private world: OBC.World | null = null

    readonly onDimensionCreate = new OBC.Event<{ length: number }>()

    constructor(components: OBC.Components) {
        super(components)
        components.add(LengthMeasurement.uuid, this)
        this.measurer = components.get(OBF.LengthMeasurement)
        this.world = components.get(CurrentWorld).world

        if (this.measurer && this.world) {
            this.measurer.world = this.world
            this.measurer.color = new THREE.Color(0x73cee2)
            this.setupEventListeners()
        }
        this.enabled = true
    }

    private setupEventListeners() {
        if (!this.measurer) return

        // Listen for when measurements are created
        this.measurer.list.onItemAdded.add((dimension) => {
            this.onDimensionCreate.trigger({ length: dimension.value })
        })

        // Set up double-click event for creating measurements
        this.setupDoubleClickListener()
    }

    private setupDoubleClickListener() {
        if (!this.world) return

        const container = this.world.renderer?.three.domElement
        if (!container) return

        container.ondblclick = () => {
            if (this.measurer?.enabled) {
                this.measurer.create()
            }
        }
    }

    createFreeMeasurements() {
        if (!this.measurer || !this.world) return


        this.enabled = true
        this.measurer.enabled = true
        this.measurer.mode = 'free'
    }

    createEdgeMeasurements() {
        if (!this.measurer || !this.world) return

        // Enable the component and edge measurement mode with snapping
        this.enabled = true
        this.measurer.enabled = true
        this.measurer.mode = 'edge'
    }

    create() {
        if (!this.measurer) return

        // Create a measurement programmatically
        // This will start the measurement creation process
        this.measurer.create()
    }

    delete() {
        if (!this.measurer) return

        // Delete the last created measurement
        this.measurer.delete()
        this.measurer.endCreation()
    }

    deleteAll() {
        if (!this.measurer) return

        // Delete all measurements using the list
        this.measurer.list.clear()
        this.measurer.endCreation()
        this.measurer.enabled = false
    }

    getAllValues() {
        if (!this.measurer) return []

        const lengths: number[] = []
        for (const line of this.measurer.list) {
            lengths.push(line.value)
        }
        return lengths
    }

    dispose() {
        if (this.measurer) {
            this.measurer.enabled = false
            this.measurer.list.clear()
        }
        this.enabled = false
        this.measurer = null
        this.world = null
        this.onDimensionCreate.reset()
    }
}