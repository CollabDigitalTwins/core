import type { LayerColors } from '../../../../types/datasetTypes'
import { Marker } from 'maplibre-gl'

// Custom events for marker actions
const MARKER_REMOVED_EVENT = 'markerRemoved'
const MARKER_MOVED_EVENT = 'markerMoved'
const MARKER_EDITING_CHANGED_EVENT = 'markerEditingChanged'

// Interface for marker events
interface MarkerEventDetail {
  coordinates?: [number, number]
  editing?: boolean
}

export interface ClusterDataset {
  name: string
  data: any[]
  layerColor?: LayerColors | string
}

export interface ClusterOptions {
  longitudeKey?: string
  latitudeKey?: string
  color?: string
  clusterMaxZoom?: number
  clusterRadius?: number
}

export class MarkerManager {
  private markers: Marker[] = []
  private marker: Marker | null = null
  private map: any = null
  private escKeyCleanup: (() => void) | null = null
  private _editing: boolean = false
  private _coordinates: [number, number] | null = null
  private defaultColour = '#73cee2'
  private allowMultiple: boolean = false // <-- Add this

  constructor() {
    this.handleEscKey = this.handleEscKey.bind(this)
    this.handleMarkerDragEnd = this.handleMarkerDragEnd.bind(this)
  }

  // Getter for editing state
  get editing(): boolean {
    return this._editing
  }

  // Setter for editing state
  set editing(value: boolean) {
    if (this._editing !== value) {
      this._editing = value
      this.updateMarkerDraggable()
      this.dispatchEditingChangedEvent()
    }
  }

  // Getter for coordinates
  get coordinates(): [number, number] | null {
    return this._coordinates
  }

  // Create and add a marker to the map
  create(
    coordinates: [number, number],
    map: any,
    options?: { allowMultiple?: boolean, layerColor?: LayerColors | string, editing?: boolean },
  ): Marker {
    this.allowMultiple = options?.allowMultiple ?? false

    if (!this.allowMultiple) {
      this.remove()
    }

    this.map = map
    this._coordinates = coordinates
    const editing = options?.editing ?? false
    const layerColor = options?.layerColor

    // Create marker element
    const markerElement = document.createElement('div')
    markerElement.style.width = '15px'
    markerElement.style.height = '15px'
    markerElement.style.borderRadius = '50%'
    markerElement.style.backgroundColor
      = typeof layerColor === 'string'
        ? layerColor
        : (layerColor?.color || this.defaultColour)
    markerElement.style.border = '3px solid white'
    markerElement.style.cursor = editing ? 'move' : 'pointer'

    // Create the marker
    const newMarker = new Marker({
      element: markerElement,
      anchor: 'center',
      draggable: editing,
    })
      .setLngLat(coordinates)
      .addTo(map)

    if (editing) {
      newMarker.on('dragend', this.handleMarkerDragEnd)
    }

    if (this.allowMultiple) {
      this.markers.push(newMarker)
    }
    else {
      this.marker = newMarker
    }

    this.setupEscapeKeyListener()

    return newMarker
  }

  // Update marker draggable state
  private updateMarkerDraggable(): void {
    if (this.marker) {
      // Remove existing drag listener
      this.marker.off('dragend', this.handleMarkerDragEnd)

      // Update draggable state
      this.marker.setDraggable(this._editing)

      // Update cursor style
      const element = this.marker.getElement()
      if (element) {
        element.style.cursor = this._editing ? 'dragging' : 'pointer'
      }

      // Add drag listener if editing
      if (this._editing) {
        this.marker.on('dragend', this.handleMarkerDragEnd)
      }
    }
  }

  // Handle marker drag end
  private handleMarkerDragEnd(): void {
    if (this.marker) {
      const newCoordinates = this.marker.getLngLat().toArray() as [number, number]
      this._coordinates = newCoordinates
      this.dispatchMarkerMovedEvent(newCoordinates)
    }
  }

  // Handle escape key press
  private handleEscKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.remove()
    }
  }

  // Set up escape key listener
  private setupEscapeKeyListener(): void {
    // Clean up existing listener
    if (this.escKeyCleanup) {
      this.escKeyCleanup()
    }

    // Add new listener
    document.addEventListener('keydown', this.handleEscKey)

    // Store cleanup function
    this.escKeyCleanup = () => {
      document.removeEventListener('keydown', this.handleEscKey)
    }
  }

  // Remove the marker(s)
  remove(): void {
    if (this.allowMultiple) {
      for (const marker of this.markers) marker.remove()
      this.markers = []
      this._coordinates = null
      this.dispatchMarkerRemovedEvent()
    }
    else if (this.marker) {
      this.marker.remove()
      this.marker = null
      this._coordinates = null
      this.dispatchMarkerRemovedEvent()
    }

    // Clean up escape key listener
    if (this.escKeyCleanup) {
      this.escKeyCleanup()
      this.escKeyCleanup = null
    }
  }

  // Update marker position
  updatePosition(coordinates: [number, number]): void {
    if (this.marker) {
      this.marker.setLngLat(coordinates)
      this._coordinates = coordinates
    }
  }

  // Check if marker exists
  hasMarker(): boolean {
    return this.marker !== null
  }

  // Get the underlying MapLibre marker instance
  getMarker(): Marker | null {
    return this.marker
  }

  // Listen to marker events on this instance
  onRemoved(callback: (event: CustomEvent) => void): () => void {
    document.addEventListener(MARKER_REMOVED_EVENT, callback as EventListener)
    return () => {
      document.removeEventListener(MARKER_REMOVED_EVENT, callback as EventListener)
    }
  }

  onMoved(callback: (event: CustomEvent) => void): () => void {
    document.addEventListener(MARKER_MOVED_EVENT, callback as EventListener)
    return () => {
      document.removeEventListener(MARKER_MOVED_EVENT, callback as EventListener)
    }
  }

  onEditingChanged(callback: (event: CustomEvent) => void): () => void {
    document.addEventListener(MARKER_EDITING_CHANGED_EVENT, callback as EventListener)
    return () => {
      document.removeEventListener(MARKER_EDITING_CHANGED_EVENT, callback as EventListener)
    }
  }

  // Dispatch marker removed event
  private dispatchMarkerRemovedEvent(): void {
    const event = new CustomEvent(MARKER_REMOVED_EVENT, {
      detail: {
        timestamp: new Date().toISOString(),
        markerType: 'marker',
      } as MarkerEventDetail,
    })
    document.dispatchEvent(event)
  }

  // Dispatch marker moved event
  private dispatchMarkerMovedEvent(coordinates: [number, number]): void {
    const event = new CustomEvent(MARKER_MOVED_EVENT, {
      detail: {
        timestamp: new Date().toISOString(),
        markerType: 'marker',
        coordinates,
      } as MarkerEventDetail,
    })
    document.dispatchEvent(event)
  }

  // Dispatch editing state changed event
  private dispatchEditingChangedEvent(): void {
    const event = new CustomEvent(MARKER_EDITING_CHANGED_EVENT, {
      detail: {
        timestamp: new Date().toISOString(),
        markerType: 'marker',
        editing: this._editing,
        coordinates: this._coordinates,
      } as MarkerEventDetail,
    })
    document.dispatchEvent(event)
  }

  static addClusterMarkers(
    map: any,
    dataset: ClusterDataset,
    options: ClusterOptions = {},
  ): void {
    const {
      longitudeKey = 'longitude',
      latitudeKey = 'latitude',
      color = (typeof dataset.layerColor === 'string'
        ? dataset.layerColor
        : dataset.layerColor?.color) || '#73cee2',
      clusterMaxZoom = 14,
      clusterRadius = 50,
    } = options

    const sourceId = `cluster-${dataset.name}`
    const clusterLayerId = `cluster-layer-${dataset.name}`
    const countLayerId = `cluster-count-${dataset.name}`
    const unclusteredLayerId = `unclustered-${dataset.name}`

    // Prepare GeoJSON FeatureCollection
    const geojson = {
      type: 'FeatureCollection',
      features: dataset.data
        .filter((item: any) => item[longitudeKey] && item[latitudeKey])
        .map((item: any) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [item[longitudeKey], item[latitudeKey]],
          },
          properties: { name: dataset.name },
        })),
    }

    // Add or update source
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as any).setData(geojson)
    }
    else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom,
        clusterRadius,
      })

      // Cluster circles
      map.addLayer({
        id: clusterLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': color,
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            100,
            30,
            750,
            40,
          ],
        },
      })

      // Cluster count labels
      map.addLayer({
        id: countLayerId,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Unclustered points
      map.addLayer({
        id: unclusteredLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': color,
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })
    }
  }

  // Cleanup method for when the instance is no longer needed
  destroy(): void {
    this.remove()
  }
}
