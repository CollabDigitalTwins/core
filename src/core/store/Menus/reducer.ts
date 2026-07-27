// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type { ViewerNames } from '../../types/dbTypes'
import type { ActionMap } from '../ActionMap'

export type SidebarTabType = 'file' | 'layers' | 'communication' |  'sensors' | 'settings'

/** Request from a viewer marker to open a comment's editor/reply box in the sidebar. */
export type CommentActionRequest = {
  commentId: number
  action: 'edit' | 'reply'
  /** Monotonic id so the same request fires again even if the target is unchanged. */
  requestId: number
}

/** Request from a viewer marker to open a sensor's editor in the sidebar. */
export type SensorActionRequest = {
  sensorId: number
  action: 'edit'
  /** Monotonic id so the same request fires again even if the target is unchanged. */
  requestId: number
}

interface MenusTypes {
  currentViewer: ViewerNames
  rowsPerPage: number
  selectedTab: SidebarTabType
  commentsVisibleInViewer: ViewerNames[]
  currentCommentId: number | null
  /** Comment double-clicked to zoom/focus. Drives the thick focus ring + camera move. */
  focusedCommentId: number | null
  /** Monotonic counter bumped on every focus dispatch so re-focusing the same comment re-zooms. */
  focusRequestId: number
  pendingCommentAction: CommentActionRequest | null
  sensorsVisibleInViewer: ViewerNames[]
  visibleSensorTypes: Partial<Record<ViewerNames, number[]>>
  visibleSensorTags: Partial<Record<ViewerNames, string[]>>
  currentSensorId: number | null
  currentSensorTypeId: number | null
  /** Sensor double-clicked to zoom/focus. Drives the thick focus ring + camera move. */
  focusedSensorId: number | null
  /** Monotonic counter bumped on every sensor focus dispatch so re-focusing re-zooms. */
  sensorFocusRequestId: number
  pendingSensorAction: SensorActionRequest | null
  /** Legend card shown for this viewer. An absent entry means shown. */
  sensorLegendVisible: Partial<Record<ViewerNames, boolean>>
  /** Sensor type the legend is pinned to, overriding the focused sensor's own type. */
  sensorLegendTypeId: Partial<Record<ViewerNames, number | null>>
}

export type MenusState = MenusTypes

export type MenusPayload = {
  ['SET_VIEWER']: Pick<MenusTypes, 'currentViewer'>
  ['SET_PAGINATION_ROWS_PER_PAGE']: Pick<MenusTypes, 'rowsPerPage'>
  ['SET_SIDEBAR_SELECTED_TAB']: Pick<MenusTypes, 'selectedTab'>
  ['SHOW_COMMENTS_IN_VIEWER']: {viewer: ViewerNames}
  ['HIDE_COMMENTS_IN_VIEWER']: {viewer: ViewerNames}
  ['SET_CURRENT_COMMENT_ID']: {commentId: number | null}
  ['SET_FOCUSED_COMMENT_ID']: {commentId: number | null}
  ['REQUEST_COMMENT_ACTION']: {commentId: number; action: 'edit' | 'reply'}
  ['CLEAR_PENDING_COMMENT_ACTION']: undefined
  ['TOGGLE_SENSOR_TYPE_VISIBILITY']: { viewer: ViewerNames; sensorTypeId: number; force?: boolean }
  ['TOGGLE_SENSOR_TAG_VISIBILITY']: { viewer: ViewerNames; sensorTag: string; force?: boolean }
  ['SHOW_ALL_SENSOR_IN_VIEWER']: {viewer: ViewerNames}
  ['HIDE_ALL_SENSORS_IN_VIEWER']: {viewer: ViewerNames}
  ['HIDE_ALL_SENSOR_TAGS_IN_VIEWER']: {viewer: ViewerNames}
  ['SET_CURRENT_SENSOR_ID']: Pick<MenusTypes, 'currentSensorId'>
  ['SET_CURRENT_SENSOR_TYPE_ID']: Pick<MenusTypes, 'currentSensorTypeId'>
  ['SET_FOCUSED_SENSOR_ID']: {sensorId: number | null}
  ['REQUEST_SENSOR_ACTION']: {sensorId: number}
  ['CLEAR_PENDING_SENSOR_ACTION']: undefined
  /** `visible` sets explicitly; omit it to flip. Not the `force` ("only show") shape used by
   *  the visibility toggles above, because the legend's close button needs an explicit hide. */
  ['TOGGLE_SENSOR_LEGEND']: { viewer: ViewerNames; visible?: boolean }
  ['SET_SENSOR_LEGEND_TYPE_ID']: { viewer: ViewerNames; sensorTypeId: number | null }
}

export type MenusActions
  = ActionMap<MenusPayload>[keyof ActionMap<MenusPayload>]

export const MenusReducer = (state: MenusState, action: MenusActions) => {
  switch (action.type) {
    case 'SET_VIEWER':
      return {
        ...state,
        currentViewer: action.payload.currentViewer,
      }
    case 'SET_PAGINATION_ROWS_PER_PAGE':
      return {
        ...state,
        rowsPerPage: action.payload.rowsPerPage,
      }
    case 'SET_SIDEBAR_SELECTED_TAB':
      return {
        ...state,
        selectedTab: action.payload.selectedTab,
      }
    case 'SHOW_COMMENTS_IN_VIEWER':
      const viewerToShow = action.payload.viewer
      if (!viewerToShow) return state
      const commentsCurrentlyVisible = state.commentsVisibleInViewer || []
      return {
      ...state,
      commentsVisibleInViewer: commentsCurrentlyVisible.includes(viewerToShow)
        ? commentsCurrentlyVisible
        : [...commentsCurrentlyVisible, viewerToShow],
      }
    case 'HIDE_COMMENTS_IN_VIEWER':
      const viewerToHide = action.payload.viewer
      if (!viewerToHide) return state
      return {
      ...state,
      commentsVisibleInViewer: (state.commentsVisibleInViewer || []).filter(
        v => v !== viewerToHide
      ),
      }
    case 'SET_CURRENT_COMMENT_ID':
      return {
        ...state,
        currentCommentId: action.payload.commentId,
      }
    case 'SET_FOCUSED_COMMENT_ID':
      return {
        ...state,
        focusedCommentId: action.payload.commentId,
        focusRequestId: state.focusRequestId + 1,
      }
    case 'REQUEST_COMMENT_ACTION':
      return {
        ...state,
        pendingCommentAction: {
          commentId: action.payload.commentId,
          action: action.payload.action,
          requestId: (state.pendingCommentAction?.requestId ?? 0) + 1,
        },
      }
    case 'CLEAR_PENDING_COMMENT_ACTION':
      if (state.pendingCommentAction === null) return state
      return {
        ...state,
        pendingCommentAction: null,
      }
    case 'SET_CURRENT_SENSOR_ID':
      return {
        ...state,
        currentSensorId: action.payload.currentSensorId,
      }
    case 'SET_CURRENT_SENSOR_TYPE_ID':
      return {
        ...state,
        currentSensorTypeId: action.payload.currentSensorTypeId,
      }
    case 'SET_FOCUSED_SENSOR_ID':
      return {
        ...state,
        focusedSensorId: action.payload.sensorId,
        sensorFocusRequestId: state.sensorFocusRequestId + 1,
        // Focusing a sensor hands the legend back to that sensor's own type. Clearing on a null
        // payload instead would undo the selection the legend dropdown just made, since it
        // clears the focus right after pinning a type.
        sensorLegendTypeId: action.payload.sensorId == null ? state.sensorLegendTypeId : {},
      }
    case 'REQUEST_SENSOR_ACTION':
      return {
        ...state,
        pendingSensorAction: {
          sensorId: action.payload.sensorId,
          // `as const`, or the literal widens to `string` and the reducer's inferred return
          // type stops being assignable to MenusState.
          action: 'edit' as const,
          requestId: (state.pendingSensorAction?.requestId ?? 0) + 1,
        },
      }
    case 'CLEAR_PENDING_SENSOR_ACTION':
      if (state.pendingSensorAction === null) return state
      return {
        ...state,
        pendingSensorAction: null,
      }
    case 'HIDE_ALL_SENSORS_IN_VIEWER':
      const sensorViewerToHide = action.payload.viewer
      if (!sensorViewerToHide) return state
      return {
        ...state,
        sensorsVisibleInViewer: (state.sensorsVisibleInViewer || []).filter(
          v => v !== sensorViewerToHide
        ),
        // Also hide all sensor types for this viewer
        visibleSensorTypes: {
          ...state.visibleSensorTypes,
          [sensorViewerToHide]: [],
        },
      }
    case 'HIDE_ALL_SENSOR_TAGS_IN_VIEWER':
      const tagViewerToHide = action.payload.viewer
      if (!tagViewerToHide) return state
      return {
        ...state,
        visibleSensorTags: {
          ...state.visibleSensorTags,
          [tagViewerToHide]: [],
        },
      }
    case 'TOGGLE_SENSOR_TYPE_VISIBILITY':
      const { viewer: toggleViewer, sensorTypeId, force } = action.payload
      if (!toggleViewer || !sensorTypeId) return state
      const currentTypesForViewer = state.visibleSensorTypes?.[toggleViewer] || []
      const isCurrentlyVisible = currentTypesForViewer.includes(sensorTypeId)
      // force=true → only show (idempotent); force=false/undefined → toggle
      if (force && isCurrentlyVisible) return state
      return {
        ...state,
        visibleSensorTypes: {
          ...state.visibleSensorTypes,
          [toggleViewer]: (force || !isCurrentlyVisible)
            ? [...currentTypesForViewer, sensorTypeId]
            : currentTypesForViewer.filter(t => t !== sensorTypeId),
        },
      }
    case 'TOGGLE_SENSOR_TAG_VISIBILITY':
      const { viewer: toggleTagViewer, sensorTag, force: forceTag } = action.payload
      if (!toggleTagViewer || !sensorTag) return state
      const currentTagsForViewer = state.visibleSensorTags?.[toggleTagViewer] || []
      const isTagCurrentlyVisible = currentTagsForViewer.includes(sensorTag)
      if (forceTag && isTagCurrentlyVisible) return state
      return {
        ...state,
        visibleSensorTags: {
          ...state.visibleSensorTags,
          [toggleTagViewer]: (forceTag || !isTagCurrentlyVisible)
            ? [...currentTagsForViewer, sensorTag]
            : currentTagsForViewer.filter(t => t !== sensorTag),
        },
      }

    case 'TOGGLE_SENSOR_LEGEND':
      const { viewer: legendViewer, visible } = action.payload
      if (!legendViewer) return state
      const legendCurrentlyVisible = state.sensorLegendVisible?.[legendViewer] !== false
      return {
        ...state,
        sensorLegendVisible: {
          ...state.sensorLegendVisible,
          [legendViewer]: visible ?? !legendCurrentlyVisible,
        },
      }
    case 'SET_SENSOR_LEGEND_TYPE_ID':
      const { viewer: legendTypeViewer, sensorTypeId: legendTypeId } = action.payload
      if (!legendTypeViewer) return state
      return {
        ...state,
        sensorLegendTypeId: {
          ...state.sensorLegendTypeId,
          [legendTypeViewer]: legendTypeId,
        },
      }

    case 'SHOW_ALL_SENSOR_IN_VIEWER':
      const showAllViewer = action.payload.viewer
      if (!showAllViewer) return state
      // This is called when opening the add sensor tool - we don't know all types yet
      // So we just ensure the viewer is in sensorsVisibleInViewer
      return state
    default:
      return state
  }
}
