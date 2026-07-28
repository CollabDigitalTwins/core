'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import { Source, Layer, Popup, Marker } from 'react-map-gl/maplibre'
import { toast } from 'sonner'

import { useComments, useDeleteComments } from '../../../../../../../hooks/comments/comments'
import { useUser, useUsers } from '../../../../../../../hooks/users/users'
import { MapContext, MenusContext } from '../../../../../../../store'
import { ViewerNames, type Comment as IComment } from '../../../../../../../types/dbTypes'
import { commentRingShadow, markerOcclusionProps } from '../../../../../../../utils/markerUtils'
import { Avatar } from '../../../../../../ui/Avatar'
import Comment from '../../../../../../ui/Comments/Comment'
import { UserAvatar } from '../../../../../../ui/UserAvatar'
import { extractCoordinatesFromFeature } from '../../../../utils/extractCoordinates'
import { MapLayerClickPriority } from '../../../../utils/MapEventManager/MapClickManager'
import { createClusterLayer, createClusterCountLayer, createUnclusteredPointLayer } from '../mapLayersUtils'

import type { ClickCallback } from '../../../../utils/MapEventManager/MapClickManager';
import type { MapGeoJSONFeature, MapLayerMouseEvent } from 'maplibre-gl'

type MapComment = IComment & {
  authorName?: string
  imageFileId?: number | null
}

const CommentAvatarMarker = ({ feature, isHighlighted, isFocused, onMouseEnter, onMouseLeave, onClick, onDoubleClick, center, offset }: { feature: MapGeoJSONFeature; isHighlighted?: boolean; isFocused?: boolean; onMouseEnter?: () => void; onMouseLeave?: () => void; onClick?: () => void; onDoubleClick?: () => void; center?: [number, number]; offset?: [number, number] }) => {
  const authorId = feature.properties?.authorId
  const { user: author } = useUser(authorId != null ? String(authorId) : '')
  const userName = feature.properties?.authorName
  const userImageFileId = feature.properties?.imageFileId
  const resolvedImageFileId = author?.imageFileId ?? userImageFileId ?? null

  // When part of an expanded (spiderfied) cluster, position at the cluster
  // center and fan out with a pixel offset instead of the feature's own coords.
  const coords = center ? { lng: center[0], lat: center[1] } : extractCoordinatesFromFeature(feature)
  if (!coords) return null

  const scale = isFocused ? 1.25 : isHighlighted ? 1.2 : 1

  return (
    <Marker key={String(feature.properties?.id ?? `${coords.lng},${coords.lat}`)} longitude={coords.lng} latitude={coords.lat} anchor="center" offset={offset} {...markerOcclusionProps}>
      <div
        title={onDoubleClick ? 'Double click to zoom' : undefined}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          boxShadow: commentRingShadow({ highlight: isHighlighted, focused: isFocused }),
          transition: 'all 0.2s ease-in-out',
          transform: `scale(${scale})`,
          overflow: 'hidden',
          cursor: onClick || onDoubleClick ? 'pointer' : undefined,
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
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
  const { deleteComments } = useDeleteComments()
  const { state: menusState, dispatch: menusDispatch, setIsSidebarOpen } = React.useContext(MenusContext)
  const { commentsVisibleInViewer, currentCommentId, focusedCommentId, focusRequestId } = menusState.menus

  const focusComment = React.useCallback((commentId?: number) => {
    if (commentId == null) return
    menusDispatch({ type: 'SET_CURRENT_COMMENT_ID', payload: { commentId } })
    menusDispatch({ type: 'SET_FOCUSED_COMMENT_ID', payload: { commentId } })
  }, [menusDispatch])

  // Edit/reply from the popup card open the comment's editor/reply box in the sidebar,
  // matching the BIM comment card behaviour.
  const requestSidebarAction = React.useCallback((commentId: number | undefined, action: 'edit' | 'reply') => {
    if (commentId == null) return
    setIsSidebarOpen(true)
    menusDispatch({ type: 'SET_SIDEBAR_SELECTED_TAB', payload: { selectedTab: 'communication' } })
    menusDispatch({ type: 'SET_CURRENT_COMMENT_ID', payload: { commentId } })
    menusDispatch({ type: 'REQUEST_COMMENT_ACTION', payload: { commentId, action } })
  }, [menusDispatch, setIsSidebarOpen])

  // Hover-to-expand (spiderfy) state for clusters
  const [spider, setSpider] = React.useState<{ center: [number, number]; features: MapGeoJSONFeature[] } | null>(null)
  const spiderCloseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelSpiderClose = React.useCallback(() => {
    if (spiderCloseTimer.current) {
      clearTimeout(spiderCloseTimer.current)
      spiderCloseTimer.current = null
    }
  }, [])

  const scheduleSpiderClose = React.useCallback(() => {
    cancelSpiderClose()
    spiderCloseTimer.current = setTimeout(() => setSpider(null), 150)
  }, [cancelSpiderClose])

  const openPopupFromFeature = React.useCallback((feature?: MapGeoJSONFeature) => {
    if (!feature || feature.properties.point_count) return
    if (feature.geometry.type !== 'Point') return
    const [longitude, latitude] = feature.geometry.coordinates
    const p = feature.properties as MapComment
    setPopUpInfo({
      id: Number(p.id),
      authorId: Number(p.authorId),
      organizationId: feature.properties?.organizationId,
      visible: feature.properties?.visible,
      longitude,
      latitude,
      text: p.text,
      createdAt: p.createdAt,
      authorName: p.authorName,
      imageFileId: p.imageFileId,
      viewer: ViewerNames.map,
    })
  }, [])

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

  // Keep the latest comments available to the focus effect without re-running it every render.
  const eligibleCommentsRef = React.useRef(eligibleComments)
  eligibleCommentsRef.current = eligibleComments

  // Close popup if the comment was deleted
  React.useEffect(() => {
    if (popupInfo && !comments.find((c) => c.id === popupInfo.id)) {
      setPopUpInfo(null)
    }
  }, [comments, popupInfo])

  // Fly to a comment when it is focused (double-clicked here or in the sidebar) and open its card.
  React.useEffect(() => {
    if (focusedCommentId == null || !map) return
    const target = eligibleCommentsRef.current.find((c) => c.id === focusedCommentId)
    if (!target || target.longitude == null || target.latitude == null) return
    map.flyTo({ center: [target.longitude, target.latitude], zoom: Math.max(map.getZoom(), 17), duration: 800 })
    setPopUpInfo({
      id: target.id,
      authorId: target.authorId,
      organizationId: target.organizationId,
      visible: target.visible,
      longitude: target.longitude,
      latitude: target.latitude,
      text: target.text,
      createdAt: target.createdAt,
      authorName: target.authorName,
      imageFileId: target.imageFileId,
      viewer: ViewerNames.map,
    })
  }, [focusRequestId, map])

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
      openPopupFromFeature(features?.[0])
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
  }, [map, mapClickManager, openPopupFromFeature])

  const handleRemoveComment = () => {
    if (popupInfo?.id == null) return
    toast.success(t('commentDeleted'))
    // Cascade: delete the comment together with its replies (the DB does not cascade).
    const id = popupInfo.id
    const replyIds = comments.filter((c) => c.replyToId === id).map((c) => c.id)
    void deleteComments({ ids: [id, ...replyIds] })
    setPopUpInfo(null)
  }

  // Close the spiderfied cluster when the map moves (positions would be stale)
  React.useEffect(() => {
    if (!map) return
    const close = () => setSpider(null)
    map.on('movestart', close)
    map.on('zoomstart', close)
    return () => {
      map.off('movestart', close)
      map.off('zoomstart', close)
    }
  }, [map])

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
      source.getClusterExpansionZoom(clusterId).then(
        (zoom: number) => {
          map.easeTo({ center: [lng, lat], zoom })
        },
      )
        .catch((error) => {
          console.error(error)
        })
    }

    // Hover a cluster to expand (spiderfy) its members
    const expandClusterOnHover = (e: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer'
      const feature = e.features?.[0]
      if (!feature || !feature.properties.cluster_id) return
      if (!('coordinates' in feature.geometry)) return
      const center = feature.geometry.coordinates as [number, number]
      const clusterId = feature.properties.cluster_id as number

      const source = map.getSource('comments') as any
      source.getClusterLeaves(clusterId, Infinity, 0)
        .then((leaves: MapGeoJSONFeature[]) => {
          cancelSpiderClose()
          setSpider({ center, features: leaves })
        })
        .catch((error: unknown) => {
          console.error(error)
        })
    }

    const mouseLeaveCluster = () => {
      map.getCanvas().style.cursor = ''
      scheduleSpiderClose()
    }

    // Hover expands the cluster; click still zooms in to decluster as a fallback
    map.on('click', 'comments-clusters', zoomInToDecluster)
    map.on('mouseenter', 'comments-clusters', expandClusterOnHover)
    map.on('mouseleave', 'comments-clusters', mouseLeaveCluster)
    return () => {
      map.off('click', 'comments-clusters', zoomInToDecluster)
      map.off('mouseenter', 'comments-clusters', expandClusterOnHover)
      map.off('mouseleave', 'comments-clusters', mouseLeaveCluster)
    }
  }, [map, cancelSpiderClose, scheduleSpiderClose])

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
          showActions
          canEdit={user.id === String(popupInfo.authorId)}
          canDelete={user.id === String(popupInfo.authorId)}
          onEdit={user.id === String(popupInfo.authorId) ? () => requestSidebarAction(popupInfo.id, 'edit') : undefined}
          onReply={() => requestSidebarAction(popupInfo.id, 'reply')}
          onRemove={user.id === String(popupInfo.authorId) ? handleRemoveComment : undefined}
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
            isFocused={focusedCommentId === feature.properties?.id}
            onMouseEnter={() => setHoveredCommentId(feature.properties?.id)}
            onMouseLeave={() => setHoveredCommentId(null)}
            onDoubleClick={() => focusComment(feature.properties?.id)}
          />
        ))}

      {/* Spiderfied cluster members shown on hover */}
      {spider && spider.features.map((feature, i) => {
        const n = spider.features.length
        const angle = (2 * Math.PI * i) / n - Math.PI / 2
        const radius = Math.min(60, 24 + n * 4)
        const offset: [number, number] = [Math.cos(angle) * radius, Math.sin(angle) * radius]
        const id = feature.properties?.id
        return (
          <CommentAvatarMarker
            key={`spider-${String(id)}`}
            feature={feature}
            center={spider.center}
            offset={offset}
            isHighlighted={currentCommentId === id || hoveredCommentId === id}
            isFocused={focusedCommentId === id}
            onMouseEnter={() => { cancelSpiderClose(); setHoveredCommentId(id) }}
            onMouseLeave={() => { scheduleSpiderClose(); setHoveredCommentId(null) }}
            onClick={() => { openPopupFromFeature(feature); setSpider(null) }}
            onDoubleClick={() => { focusComment(id); setSpider(null) }}
          />
        )
      })}
    </Source>}
    </>
  )
}
