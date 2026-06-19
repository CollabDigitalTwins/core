'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { MapContext, MenusContext } from '../../../../../../../store'
import * as React from 'react'
import { Source, Layer, Popup, Marker } from 'react-map-gl/maplibre'
import type { MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl'
import Comment from '../../../../../../ui/Comments/Comment'
import { Avatar } from '../../../../../../ui/Avatar'
import { UserAvatar } from '../../../../../../ui/UserAvatar'
import { ViewerNames, type Comment as IComment } from '../../../../../../../types/dbTypes'

import { MapLayerClickPriority, ClickCallback } from '../../../../utils/MapEventManager/MapClickManager'
import { extractCoordinatesFromFeature } from '../../../../utils/extractCoordinates'
import { useComment, useComments } from '../../../../../../../hooks/comments/comments'
import { useUser, useUsers } from '../../../../../../../hooks/users/users'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { createClusterLayer, createClusterCountLayer, createUnclusteredPointLayer } from '../mapLayersUtils'

type MapComment = IComment & {
  authorName?: string
  imageFileId?: number | null
}

const CommentAvatarMarker = ({ feature, isHighlighted, onMouseEnter, onMouseLeave }: { feature: MapGeoJSONFeature; isHighlighted?: boolean; onMouseEnter?: () => void; onMouseLeave?: () => void }) => {
  const authorId = feature.properties?.authorId
  const { user: author } = useUser(authorId != null ? String(authorId) : '')
  const userName = feature.properties?.authorName
  const userImageFileId = feature.properties?.imageFileId
  const resolvedImageFileId = author?.imageFileId ?? userImageFileId ?? null

  const coords = extractCoordinatesFromFeature(feature)
  if (!coords) return null

  return (
    <Marker key={String(feature.properties?.id ?? `${coords.lng},${coords.lat}`)} longitude={coords.lng} latitude={coords.lat} anchor="center">
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          boxShadow: isHighlighted
            ? '0 0 0 3px #73cee2, 0 0 8px rgba(115, 206, 226, 0.5)'
            : '0 0 0 2px white ',
          transition: 'all 0.2s ease-in-out',
          transform: isHighlighted ? 'scale(1.2)' : 'scale(1)',
          overflow: 'hidden',
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Avatar className="h-full w-full">
          <UserAvatar
            imageFileId={resolvedImageFileId}
            name={userName}
            className="h-full w-full rounded-full object-cover"
          />
        </Avatar>
      </div>
    </Marker>
  )
}

export const CommentLayer = () => {
    const [hoveredCommentId, setHoveredCommentId] = React.useState<number | null>(null)
  const clusterLayer = createClusterLayer('comments')
  const clusterCountLayer = createClusterCountLayer('comments')
  const unclusteredPointLayer = createUnclusteredPointLayer('comments')

  // global map state

  const t = useTranslations('CommentLayers')

  const { state: mapState } = React.useContext(MapContext)
  const { map, mapClickManager } = mapState.map
  const { comments } = useComments()
  const { users } = useUsers()
  const user = useSession().data?.user

  const [popupInfo, setPopUpInfo] = React.useState<(Partial<IComment> & { authorName?: string; imageFileId?: number | null }) | null>(null)
  const { user: popupAuthor } = useUser(popupInfo?.authorId != null ? String(popupInfo.authorId) : '')
  const { deleteComment } = useComment(popupInfo?.id ?? null)
  const { state: menusState } = React.useContext(MenusContext)
  const { commentsVisibleInViewer, currentCommentId } = menusState.menus

  const eligibleComments = comments
    .filter((comment) => comment.viewer === ViewerNames.map)
    .map((comment) => {
      const user = users.find(u => u.id === comment.authorId)
      return {
        ...comment,
        authorName: user?.name ?? 'Unknown User',
        imageFileId: user?.imageFileId ?? null,
      }
    })

  // Close popup if the comment was deleted
  React.useEffect(() => {
    if (popupInfo && !comments.find((c) => c.id === popupInfo.id)) {
      setPopUpInfo(null)
    }
  }, [comments, popupInfo])

  const geojsonCommentData = React.useMemo(() => {
    const convertDataToGeojson = (commentData: MapComment[]): GeoJSON.FeatureCollection<GeoJSON.Point, { [key: string]: any }> => {
      const commentFeatures: GeoJSON.Feature<GeoJSON.Point, { [key: string]: any }>[] = commentData
        .map((comment: MapComment) => {
          const { longitude, latitude, id, text, createdAt, authorId, organizationId, visible, authorName, imageFileId } = comment

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            properties: {
              id: Number(id),
              organizationId,
              visible,
              longitude,
              latitude,
              authorId: Number(authorId),
              authorName,
              imageFileId,
              text,
              createdAt,
              viewer: ViewerNames.map,
            },
          }
        })

      const commentFC: GeoJSON.FeatureCollection<GeoJSON.Point, { [key: string]: any }> = {
        type: 'FeatureCollection',
        features: commentFeatures,
      }
      return commentFC
    }
    return convertDataToGeojson(eligibleComments)
  }, [eligibleComments])

  // event listeners for comment unclustered points
  React.useEffect(() => {
    if (!map) return
    const showCommentPopUp: ClickCallback = (e: MapLayerMouseEvent, features: MapGeoJSONFeature[]) => {
      const feature = features?.[0]

      if (!feature || feature.properties.point_count) return

      if (feature.geometry.type != 'Point') return
      const [longitude, latitude] = feature.geometry.coordinates
      const featureProperties = feature.properties as MapComment
      const { id, authorId, text, createdAt, authorName, imageFileId } = featureProperties
      setPopUpInfo({
        id: Number(id),
        authorId: Number(authorId),
        organizationId: feature.properties?.organizationId,
        visible: feature.properties?.visible,
        longitude,
        latitude,
        text,
        createdAt,
        authorName,
        imageFileId,
        viewer: ViewerNames.map,
      })
    }

    const mouseEnterChangeCursor = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const mouseLeaveChangeCursor = () => {
      map.getCanvas().style.cursor = ''
    }

    // event listener for clicking on single point to show comment, hover to change cursor
    mapClickManager.register('comments-unclustered-points', MapLayerClickPriority.CommentLayersClickPriority, showCommentPopUp)

    map.on('mouseenter', 'comments-unclustered-points', mouseEnterChangeCursor)
    map.on('mouseleave', 'comments-unclustered-points', mouseLeaveChangeCursor)
    return () => {
      mapClickManager.unregister('comments-unclustered-points')
      map.off('mouseenter', 'comments-unclustered-points', mouseEnterChangeCursor)
      map.off('mouseleave', 'comments-unclustered-points', mouseLeaveChangeCursor)
    }
  }, [map, mapClickManager])

  const handleRemoveComment = () => {
    toast.success(t('commentDeleted'))
    deleteComment()
    setPopUpInfo(null)
  }

  // event listeners for clustered points
  React.useEffect(() => {
    if (!map) return

    const zoomInToDecluster = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0] // only proceed if this is actually a cluster
      if (!feature || !feature.properties.cluster_id) return

      const clusterId = feature.properties.cluster_id as number

      // Check if geometry has coordinates (not a GeometryCollection)
      if (!('coordinates' in feature.geometry)) return
      const [lng, lat] = feature.geometry.coordinates as [number, number]

      const source = map.getSource('comments') as any
      console.log(source)
      console.log(clusterId)
      source.getClusterExpansionZoom(clusterId).then(
        (zoom: number) => {
          console.log('easing to')
          map.easeTo({ center: [lng, lat], zoom })
        },
      )
        .catch((error) => {
          console.error(error)
        })
    }

    const mouseEnterChangeCursor = () => { map.getCanvas().style.cursor = 'pointer' }
    const mouseLeaveChangeCursor = () => { map.getCanvas().style.cursor = '' }

    // event listener for clicking on single point to zoom in and decluster, hover to change cursor
    map.on('click', 'comments-clusters', zoomInToDecluster)
    map.on('mouseenter', 'comments-clusters', mouseEnterChangeCursor)
    map.on('mouseleave', 'comments-clusters', mouseLeaveChangeCursor)
    return () => {
      map.off('click', 'comments-clusters', zoomInToDecluster)
      map.off('mouseenter', 'comments-clusters', mouseEnterChangeCursor)
      map.off('mouseleave', 'comments-clusters', mouseLeaveChangeCursor)
    }
  }, [map])

  const renderPopup = () => {
    if (!popupInfo) return null
    return (
      <Popup
        className="noBorderPopup"
        longitude={popupInfo.longitude}
        latitude={popupInfo.latitude}
        closeOnClick={false}
        onClose={() => setPopUpInfo(null)}
        anchor="bottom"
        style={{ height: '50px', border: 'none', boxShadow: 'none' }}
        offset={[0, 10]}
      >
        <Comment
          userName={popupInfo.authorName || ''}
          userImage={popupAuthor?.imageFileId ?? popupInfo.imageFileId ?? null}
          userImageFileId={popupAuthor?.imageFileId ?? popupInfo.imageFileId ?? null}
          text={popupInfo.text}
          createdAt={popupInfo.createdAt}
          onRemove={user.id === String(popupInfo.authorId) ? handleRemoveComment : null}
          onClose={() => setPopUpInfo(null)}
        />
        {/* inline styles to override MapLibre’s Pop up CSS */}
        <style>
          {`
              .noBorderPopup .maplibregl-popup-content {
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }
              .noBorderPopup .maplibregl-popup-tip {
                display: none !important;
              }
            `}
        </style>
      </Popup>
    )
  }

  // Track unclustered comments to display avatars
  const [unclusteredFeatures, setUnclusteredFeatures] = React.useState<MapGeoJSONFeature[]>([])

  React.useEffect(() => {
    if (!map) return

    const updateUnclusteredFeatures = () => {
      const allFeatures = map.querySourceFeatures('comments')
      const unclusteredOnly = allFeatures.filter(
        (f) => !f.properties?.cluster && !f.properties?.point_count
      )

      // Deduplicate by id
      const uniqueFeatures = new Map()
      unclusteredOnly.forEach((f) => uniqueFeatures.set(f.properties.id, f))
      setUnclusteredFeatures(Array.from(uniqueFeatures.values()))
    }

    const onSourceData = (e: any) => {
      if (e?.sourceId === 'comments') updateUnclusteredFeatures()
    }

    map.on('sourcedata', onSourceData)
    map.on('moveend', updateUnclusteredFeatures)
    map.on('zoomend', updateUnclusteredFeatures)

    updateUnclusteredFeatures()

    return () => {
      map.off('sourcedata', onSourceData)
      map.off('moveend', updateUnclusteredFeatures)
      map.off('zoomend', updateUnclusteredFeatures)
    }
  }, [map])

  return (
    <>
  {commentsVisibleInViewer.includes(ViewerNames.map) &&
    <Source
      id="comments"
      type="geojson"
      data={geojsonCommentData}
      cluster={true}
      clusterMaxZoom={14}
      clusterRadius={40}
    >
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
      <Layer {...unclusteredPointLayer} />

      {renderPopup()}
      {unclusteredFeatures
        .filter((feature) => feature.properties?.id !== popupInfo?.id)
        .map((feature) => (
          <CommentAvatarMarker
            key={String(feature.properties?.id)}
            feature={feature}
            isHighlighted={currentCommentId === feature.properties?.id || hoveredCommentId === feature.properties?.id}
            onMouseEnter={() => setHoveredCommentId(feature.properties?.id)}
            onMouseLeave={() => setHoveredCommentId(null)}
          />
        ))}
    </Source>}
    </>
  )
}
