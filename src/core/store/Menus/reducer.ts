import type { SensorType, ViewerNames } from '../../types/dbTypes'
import { ActionMap } from '../ActionMap'

export type SidebarTabType = 'file' | 'layers' | 'communication' |  'sensors' | 'settings'

interface MenusTypes {
  currentViewer: ViewerNames
  rowsPerPage: number
  selectedTab: SidebarTabType
  commentsVisibleInViewer: ViewerNames[]
  currentCommentId: number | null
  sensorsVisibleInViewer: ViewerNames[]
  visibleSensorTypes: Partial<Record<ViewerNames, number[]>>
  visibleSensorTags: Partial<Record<ViewerNames, string[]>>
  currentSensorId: number | null
  currentSensorTypeId: number | null
}

export type MenusState = MenusTypes

export type MenusPayload = {
  ['SET_VIEWER']: Pick<MenusTypes, 'currentViewer'>
  ['SET_PAGINATION_ROWS_PER_PAGE']: Pick<MenusTypes, 'rowsPerPage'>
  ['SET_SIDEBAR_SELECTED_TAB']: Pick<MenusTypes, 'selectedTab'>
  ['SHOW_COMMENTS_IN_VIEWER']: {viewer: ViewerNames}
  ['HIDE_COMMENTS_IN_VIEWER']: {viewer: ViewerNames}
  ['SET_CURRENT_COMMENT_ID']: {commentId: number | null}
  ['TOGGLE_SENSOR_TYPE_VISIBILITY']: { viewer: ViewerNames; sensorTypeId: number; force?: boolean }
  ['TOGGLE_SENSOR_TAG_VISIBILITY']: { viewer: ViewerNames; sensorTag: string; force?: boolean }
  ['SHOW_ALL_SENSOR_IN_VIEWER']: {viewer: ViewerNames}
  ['HIDE_ALL_SENSORS_IN_VIEWER']: {viewer: ViewerNames}
  ['HIDE_ALL_SENSOR_TAGS_IN_VIEWER']: {viewer: ViewerNames}
  ['SET_CURRENT_SENSOR_ID']: Pick<MenusTypes, 'currentSensorId'>
  ['SET_CURRENT_SENSOR_TYPE_ID']: Pick<MenusTypes, 'currentSensorTypeId'>
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
