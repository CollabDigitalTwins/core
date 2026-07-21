// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'

import { CurrentWorld } from './CurrentWorld'

export class BCFTopicsManager extends OBC.Component {

    static readonly uuid = '00a7396c-2903-4ad7-b941-f8eca39746ab' as const

    enabled = false

    private bcfTopics: OBC.BCFTopics
    private viewpoints: OBC.Viewpoints
    private world: OBC.World | null = null

    constructor(components: OBC.Components) {
        super(components)
        components.add(BCFTopicsManager.uuid, this)

        // Initialize BCF components
        this.bcfTopics = components.get(OBC.BCFTopics)
        this.viewpoints = components.get(OBC.Viewpoints)

        // Get world from CurrentWorld component
        this.world = components.get(CurrentWorld).world
        if (this.world) {
            this.viewpoints.world = this.world
        }

        // Setup BCF Topics with default configuration
        this.bcfTopics.setup({
            author: "info@collabdigitaltwins.com", // This will be overridden when creating topics
            types: new Set([...this.bcfTopics.config.types, "Information", "Coordination", "Issue", "Clash", "Error"]),
            statuses: new Set(["Active", "In Progress", "Done", "In Review", "Closed"]),
            users: new Set(["info@collabdigitaltwins.com"]),
            version: "3"
        })

        // Setup event handlers
        this.setupEventHandlers()
    }

    private setupEventHandlers() {
        // Create a viewpoint whenever a topic is created
        this.bcfTopics.list.onItemSet.add(async ({ value: topic }) => {
            if (this.world) {
                const viewpoint = this.viewpoints.create()
                viewpoint.world = this.world
                viewpoint.title = `Viewpoint for ${topic.title}`

                // Update camera and take snapshot
                await viewpoint.updateCamera()
                viewpoint.takeSnapshot()

                // Link viewpoint to topic
                topic.viewpoints.add(viewpoint.guid)
            }
        })
    }

    setWorld(world: OBC.World) {
        this.world = world
        this.viewpoints.world = world
    }

    create(topicData: Partial<OBC.Topic> & { creationAuthor?: string }): OBC.Topic {
        // Override the author if provided
        if (topicData.creationAuthor) {
            this.bcfTopics.config.author = topicData.creationAuthor
        }

        const topic = this.bcfTopics.create({
            title: topicData.title || 'New Topic',
            description: topicData.description || '',
            type: topicData.type || 'Issue',
            status: topicData.status || 'Active',
            priority: topicData.priority,
            stage: topicData.stage,
            assignedTo: topicData.assignedTo,
            dueDate: topicData.dueDate,
            labels: topicData.labels || new Set()
        })

        const viewpoint = this.createViewpoint(`viewpoint-${topic.title}`)

        if (viewpoint) topic.viewpoints.add(viewpoint.guid)

        return topic
    }

    async view(topicId: string) {
        const topic = this.bcfTopics.list.get(topicId)
        if (topic && topic.viewpoints.size > 0) {
            // Get the first viewpoint and navigate to it
            const viewpointId = Array.from(topic.viewpoints)[0]
            const viewpoint = this.viewpoints.list.get(viewpointId)
            if (viewpoint) {
                await viewpoint.go()
            }
        }
    }

    edit(topic: OBC.Topic | Partial<OBC.Topic>) {
        const existingTopic = this.bcfTopics.list.get(topic.guid)
        if (existingTopic) {
            existingTopic.set(topic)
        }
    }

    remove(topicId: string): boolean {
        const topic = this.bcfTopics.list.get(topicId)
        if (topic) {
            // Remove associated viewpoints
            for (const viewpointId of topic.viewpoints) {
                this.viewpoints.list.delete(viewpointId)
            }

            // Remove the topic
            const success = this.bcfTopics.list.delete(topicId)
            return success
        } else {
            return false
        }
    }

    getTopics(): OBC.Topic[] {
        return Array.from(this.bcfTopics.list.values())
    }

    getTopicById(topicId: string): OBC.Topic | undefined {
        return this.bcfTopics.list.get(topicId)
    }

    updateTopic(topicId: string, updates: Partial<OBC.Topic>): boolean {
        const topic = this.bcfTopics.list.get(topicId)
        if (topic) {
            topic.set(updates)
            return true
        }
        return false
    }

    // Create a viewpoint for the current camera position
    createViewpoint(title: string): OBC.Viewpoint | null {
        if (!this.world) {
            return null
        }

        const viewpoint = this.viewpoints.create()
        viewpoint.world = this.world
        viewpoint.title = title

        // const highlighter = this.components.get(OBF.Highlighter)
        // const selection = highlighter?.selection
        // console.log('Viewpoint selection:', selection)

        // Update camera and take snapshot
        // viewpoint.updateCamera()
        // viewpoint.takeSnapshot()

    }

    // Export BCF file
    async exportBCF(buildingName?: string): Promise<File> {
        try {
            // Export all topics
            const bcfBuffer = await this.bcfTopics.export()

            // Create filename with date and building name
            const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
            const sanitizedBuildingName = buildingName
                ? buildingName.replace(/[^a-zA-Z0-9-_]/g, '_') // Replace invalid filename chars with underscore
                : 'UnknownBuilding'
            const filename = `${currentDate}_${sanitizedBuildingName}.bcf`

            const bcfFile = new File([bcfBuffer], filename, { type: "application/octet-stream" })

            return bcfFile
        } catch (error) {
            console.error('Failed to export BCF:', error)
            throw error
        }
    }

    // Load BCF file
    async loadBCF(file: File): Promise<{ topics: OBC.Topic[], viewpoints: OBC.Viewpoint[] }> {
        try {
            const buffer = await file.arrayBuffer()
            const result = await this.bcfTopics.load(new Uint8Array(buffer))

            return result
        } catch (error) {
            console.error('Failed to load BCF:', error)
            throw error
        }
    }

    async loadBCFFromUrl(url: string): Promise<{ topics: OBC.Topic[], viewpoints: OBC.Viewpoint[] }> {
        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const blob = await response.blob()
            const result = await this.bcfTopics.load(new Uint8Array(await blob.arrayBuffer()))
            return result
        } catch (error) {
            console.error('Failed to load BCF from URL:', error)
            throw error
        }
    }

    // Download BCF file
    async downloadBCF(buildingName?: string): Promise<void> {
        try {
            const bcfFile = await this.exportBCF(buildingName)

            // Create download link
            const a = document.createElement("a")
            a.href = URL.createObjectURL(bcfFile)
            a.download = bcfFile.name
            a.click()
            URL.revokeObjectURL(a.href)
        } catch (error) {
            console.error('Failed to download BCF:', error)
            throw error
        }
    }

    // Upload and load BCF file
    async uploadBCF(): Promise<{ topics: OBC.Topic[], viewpoints: OBC.Viewpoint[] }> {
        return new Promise((resolve, reject) => {
            const input = document.createElement("input")
            input.multiple = false
            input.accept = ".bcf"
            input.type = "file"

            input.addEventListener("change", async () => {
                const file = input.files?.[0]
                if (!file) {
                    reject(new Error('No file selected'))
                    return
                }

                try {
                    const result = await this.loadBCF(file)
                    resolve(result)
                } catch (error) {
                    reject(error)
                }
            })

            input.click()
        })
    }

    // Get viewpoint data (including snapshot)
    getViewpointSnapshot(viewpointId: string): Uint8Array | undefined {
        const viewpoint = this.viewpoints.list.get(viewpointId)
        if (viewpoint && viewpoint.snapshot) {
            return this.viewpoints.snapshots.get(viewpoint.snapshot)
        }
        return undefined
    }

    // Get all viewpoints for a topic
    getTopicViewpoints(topicId: string): OBC.Viewpoint[] {
        const topic = this.bcfTopics.list.get(topicId)
        if (topic) {
            return Array.from(topic.viewpoints).map(id => this.viewpoints.list.get(id)).filter(Boolean) as OBC.Viewpoint[]
        }
        return []
    }
}