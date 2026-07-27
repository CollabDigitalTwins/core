// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as OBC from '@thatopen/components'
import * as FRAGS from '@thatopen/fragments'
import * as THREE from 'three'

import { CurrentWorld } from '../CurrentWorld'
import { GhostMode } from '../GhostMode'

export class IDSManager extends OBC.Component {

    static readonly uuid = '00bfe409-a05a-4c21-b2f3-fc01bee3ac9f' as const

    private _enabled = false

    private _idsSpecifications: OBC.IDSSpecifications | null = null
    private _fragments: OBC.FragmentsManager | null = null
    private _currentHighlights: Map<string, any> = new Map()
    private _specs: OBC.IDSSpecification[] = []
    private _ghostMode: GhostMode | null = null
    private _idsTitle: string = 'IDS Verification'
    private _idsDescription: string = ''

    // Custom materials for IDS visualization
    private _passMaterial: THREE.Material
    private _failMaterial: THREE.Material
    private _passMeshes = new FRAGS.DataSet<THREE.Mesh>()
    private _failMeshes = new FRAGS.DataSet<THREE.Mesh>()
    private _world: OBC.World | null = null

    _pass: OBC.ModelIdMap
    _fail: OBC.ModelIdMap

    onTest: OBC.Event<{
        totalPassed: number;
        totalFailed: number;
        title?: string;
        description?: string;
    }> = new OBC.Event();

    onReset: OBC.Event<void> = new OBC.Event();

    get pass() {
        return this._pass
    }

    get fail() {
        return this._fail
    }

    get title() {
        return this._idsTitle
    }

    get description() {
        return this._idsDescription
    }

    get enabled() {
        return this._enabled
    }

    set enabled(value: boolean) {
        this._enabled = value
    }

    constructor(components: OBC.Components) {
        super(components)
        components.add(IDSManager.uuid, this)
        this._idsSpecifications = components.get(OBC.IDSSpecifications)
        this._fragments = components.get(OBC.FragmentsManager)
        this._ghostMode = components.get(GhostMode)
        this._world = components.get(CurrentWorld).world

        // Create materials for pass/fail visualization
        this._passMaterial = new THREE.MeshBasicMaterial({
            color: 0x22c55e, // Green
            transparent: true,
            opacity: 0.8,
            depthTest: false,
        })

        this._failMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Red
            transparent: true,
            opacity: 0.8,
            depthTest: false,
        })

        // Setup mesh handlers
        this._passMeshes.onItemAdded.add((mesh) => {
            if (!this._world) return
            this._world.scene.three.add(mesh)
        })

        this._failMeshes.onItemAdded.add((mesh) => {
            if (!this._world) return
            this._world.scene.three.add(mesh)
        })

        this._passMeshes.onBeforeDelete.add((mesh) => {
            mesh.removeFromParent()
            mesh.geometry.dispose()
        })

        this._failMeshes.onBeforeDelete.add((mesh) => {
            mesh.removeFromParent()
            mesh.geometry.dispose()
        })
    }

    /**
     * Loads IDS specifications from an XML file
     * @param idsFile - The IDS XML file to load
     */
    async loadFromFile(idsFile: File): Promise<void> {
        if (!this._idsSpecifications) {
            return;
        }

        try {
            // Read the file content as text
            const xmlContent = await idsFile.text();

            // Parse the title and description from XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

            const titleElement = xmlDoc.querySelector('ids\\:title, title');
            this._idsTitle = titleElement?.textContent || 'IDS Verification';

            const descriptionElement = xmlDoc.querySelector('ids\\:description, description');
            this._idsDescription = descriptionElement?.textContent || '';

            // Parse the XML and load specifications
            const specs = this._idsSpecifications.load(xmlContent);
            this._specs = specs;
        } catch (error) {
            console.error('Error loading IDS file:', error);
            throw error;
        }
    }

    async loadAndTestIDS(): Promise<void> {
        if (this._enabled && this._idsSpecifications && this._fragments && this._specs.length > 0) {
            // Run the specification test
            await this.testSpec()
        }
        else{
            this._ghostMode?.restoreModelMaterials()
        }
    }

    private testSpec = async () => {
        if (!this._specs.length || !this._idsSpecifications || !this._fragments) {
            return;
        }

        try {
            // Test all specifications and combine results
            const combinedPass: OBC.ModelIdMap = {};
            const combinedFail: OBC.ModelIdMap = {};

            for (const spec of this._specs) {
                // Test the specification against all available models using a pattern that matches any model
                const result = await spec.test([/.*/]);

                const { fail, pass } = this._idsSpecifications.getModelIdMap(result);

                // Combine results from all specifications
                // Convert the array of objects with 'value' property to a Set of numbers
                for (const [modelId, items] of Object.entries(pass)) {
                    if (!combinedPass[modelId]) {
                        combinedPass[modelId] = new Set();
                    }
                    // Extract the actual express IDs from the value property
                    const expressIds = Array.isArray(items)
                        ? items.map((item: any) => item.value)
                        : Array.from(items as Set<number>);

                    expressIds.forEach(id => combinedPass[modelId].add(id));
                }

                for (const [modelId, items] of Object.entries(fail)) {
                    if (!combinedFail[modelId]) {
                        combinedFail[modelId] = new Set();
                    }
                    // Extract the actual express IDs from the value property
                    const expressIds = Array.isArray(items)
                        ? items.map((item: any) => item.value)
                        : Array.from(items as Set<number>);

                    expressIds.forEach(id => combinedFail[modelId].add(id));
                }
            }

            this._pass = combinedPass;
            this._fail = combinedFail;

            this.onTest.trigger({
                totalPassed: Object.values(combinedPass).reduce((total, set) => total + set.size, 0),
                totalFailed: Object.values(combinedFail).reduce((total, set) => total + set.size, 0),
                title: this._idsTitle,
                description: this._idsDescription,
            });

            // Store the results for later retrieval
            this._currentHighlights.set('pass', combinedPass);
            this._currentHighlights.set('fail', combinedFail);

            // Clear previous meshes
            this._passMeshes.clear();
            this._failMeshes.clear();

            // Enable ghost mode to dim non-IDS elements
            if (this._ghostMode) {
                this._ghostMode.setModelTransparent()
            }

            // Highlight passing elements in green
            if (!OBC.ModelIdMapUtils.isEmpty(combinedPass)) {
                await this.highlightElements(combinedPass, this._passMaterial, this._passMeshes);
            }

            // Highlight failing elements in red
            if (!OBC.ModelIdMapUtils.isEmpty(combinedFail)) {
                await this.highlightElements(combinedFail, this._failMaterial, this._failMeshes);
            }

            // Finally update the fragments core to render everything
            const fragments = this._fragments;
            await fragments.core.update(true);

        } catch (error) {
            console.error('Error testing IDS specification:', error);
        }
    };

    private async highlightElements(modelIdMap: OBC.ModelIdMap, material: THREE.Material, meshDataSet: FRAGS.DataSet<THREE.Mesh>): Promise<void> {
        if (!this._fragments) return;

        for (const [modelId, expressIds] of Object.entries(modelIdMap)) {
            const model = this._fragments.list.get(modelId);
            if (!model) continue;

            const localIds = Array.from(expressIds);

            try {
                const meshDataArray = await model.getItemsGeometry(localIds);

                for (const meshData of meshDataArray) {
                    for (const data of meshData) {
                        const { positions, normals, indices } = data;
                        if (!(positions && normals && indices)) continue;

                        const bufferGeometry = new THREE.BufferGeometry();
                        bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                        bufferGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
                        bufferGeometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1));

                        if (data.transform) {
                            bufferGeometry.applyMatrix4(data.transform);
                        }

                        bufferGeometry.computeVertexNormals();

                        const mesh = new THREE.Mesh(bufferGeometry, material);
                        meshDataSet.add(mesh);
                    }
                }
            } catch {
                // Error highlighting elements for this model
            }
        }
    }



    async reset(): Promise<void> {
        // Clear IDS highlight meshes
        this._passMeshes.clear();
        this._failMeshes.clear();

        // Restore original materials (disable ghost mode)
        if (this._ghostMode) {
            this._ghostMode.restoreModelMaterials()
        }

        if (this._fragments) {
            // Clear current highlights map
            this._currentHighlights.clear();
            await this._fragments.core.update(true);
        }

        // Trigger reset event
        this.onReset.trigger();
    }

    async runSpecificationTest(): Promise<void> {
        await this.testSpec();
    }

    getTestResults() {
        return this._currentHighlights;
    }

    async dispose(): Promise<void> {
        // Reset all highlights and restore materials
        await this.reset();

        // Clear references
        this._idsSpecifications = null;
        this._fragments = null;
        this._specs = [];
        this._currentHighlights.clear();

        this._enabled = false;
    }

}