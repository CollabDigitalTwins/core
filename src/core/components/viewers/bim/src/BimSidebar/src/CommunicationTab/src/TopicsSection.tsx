'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as LR from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { BimContext, BuildingsContext, usePermissions } from '../../../../../../../../store'
import { Button } from '../../../../../../../ui/Button'
import { CollapsibleSection } from '../../../../../../../ui/CollapsibleSection'
import { BcfIcon } from '../../../../../../../ui/Icons'
import { BCFTopicsManager } from '../../../../BCFTopicsManager'

import { CollapsibleTopicItem } from './CollapsibleTopicItem'
import { CreateTopicDialog } from './CreateTopicDialog'

import type { BCFTopicFormData } from './CreateTopicDialog';
import type * as OBC from '@thatopen/components'

type TopicAction = 'view' | 'edit' | 'delete'

export function TopicsSection() {
  // Translation
  const t = useTranslations('TopicsSection')
  // Permissions
  const { ability } = usePermissions()

  // Get user session
  const { data: session } = useSession()
  const user = session?.user

  // Get BIM context
  const { state: bimState, dispatch: bimDispatch } = React.useContext(BimContext)
  const { bimComponents, bcfTopics } = bimState.bim
  // .get() throws if the component hasn't been registered yet (e.g. the BIM
  // engine is still initializing) — fall back to constructing it directly,
  // which self-registers (see BCFTopicsManager's constructor).
  let bcfTopicsManager: BCFTopicsManager | undefined
  if (bimComponents) {
    try {
      bcfTopicsManager = bimComponents.get(BCFTopicsManager)
    } catch {
      bcfTopicsManager = new BCFTopicsManager(bimComponents)
    }
  }

  // Get Buildings context
  const { state: buildingState } = React.useContext(BuildingsContext)
  const { building } = buildingState.buildings

  // Local state for dialog management
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editingTopic, setEditingTopic] = React.useState<OBC.Topic | Partial<OBC.Topic> | null>(null)

  const handleAction = React.useCallback((action: TopicAction, id: string) => {
    const topic = bcfTopics.find(t => t.guid === id)
    if (!topic) {
      return
    }

    if (action === 'view') {
      bcfTopicsManager?.view(topic.guid)
    }
    else if (action === 'edit') {
      setEditingTopic(topic)
      setCreateDialogOpen(true)
    }
    else if (action === 'delete') {
      bcfTopicsManager?.remove(topic.guid)
      // Remove from BIM state
      bimDispatch({
        type: 'REMOVE_BCF_TOPIC',
        payload: { bcfTopicId: id }
      })
    }
  }, [bcfTopics, bcfTopicsManager, bimDispatch])

  const handleAddTopic = React.useCallback(() => {
    setEditingTopic(null)
    setCreateDialogOpen(true)
  }, [])

  const handleCreateTopic = React.useCallback((formData: BCFTopicFormData) => {
    // Create BCF Topic using OBC.Topic interface
    const newTopic: OBC.Topic | Partial<OBC.Topic> = {
      guid: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      status: formData.topicStatus,
      type: formData.topicType,
      priority: formData.priority,
      stage: formData.stage,
      assignedTo: formData.assignedTo || undefined,
      dueDate: formData.dueDate || undefined,
      creationDate: new Date(),
      creationAuthor: user?.email || 'anonymous@example.com',
      labels: new Set(formData.labels)
    }

    // Add to BCF manager
    const createdTopic = bcfTopicsManager?.create({
      ...newTopic,
      creationAuthor: user?.email || 'anonymous@example.com'
    })

    const topicToAdd = createdTopic || newTopic

    // Check if topic already exists in global state before adding
    const existingTopic = bcfTopics.find(existingTopic => existingTopic.guid === topicToAdd.guid)
    if (!existingTopic) {
      // Add to BIM state (use the created topic or fallback to newTopic)
      bimDispatch({
        type: 'ADD_BCF_TOPIC',
        payload: { bcfTopic: topicToAdd }
      })
    }

  }, [bcfTopicsManager, bimDispatch, user?.email, bcfTopics])

  const handleEditTopic = React.useCallback((formData: BCFTopicFormData) => {
    if (!editingTopic) return

    try {
      // Update the existing topic with new data
      const updatedTopic: OBC.Topic |  Partial<OBC.Topic> = {
        ...editingTopic,
        title: formData.title,
        description: formData.description,
        status: formData.topicStatus,
        type: formData.topicType,
        priority: formData.priority,
        stage: formData.stage,
        assignedTo: formData.assignedTo || undefined,
        dueDate: formData.dueDate || undefined,
        labels: new Set(formData.labels),
        modifiedDate: new Date(),
        modifiedAuthor: user?.email || 'anonymous@example.com'
      }

      // Update in BCF Manager first
      bcfTopicsManager?.edit(updatedTopic)

      // Update in BIM state
      bimDispatch({
        type: 'EDIT_BCF_TOPIC',
        payload: { bcfTopic: updatedTopic }
      })

      // Clear editing state
      setEditingTopic(null)
    } catch (error) {
      console.error('Error editing topic:', error)
    }
  }, [editingTopic, bimDispatch, bcfTopicsManager, user?.email])

  const handleDialogSubmit = React.useCallback((formData: BCFTopicFormData) => {
    if (editingTopic) {
      handleEditTopic(formData)
    } else {
      handleCreateTopic(formData)
    }
  }, [editingTopic, handleEditTopic, handleCreateTopic])

  const handleDialogClose = React.useCallback((open: boolean) => {
    setCreateDialogOpen(open)
    if (!open) {
      setEditingTopic(null)
    }
  }, [])

  const handleExportBCF = React.useCallback(async () => {
    try {
      const buildingName = building?.buildingName || building?.buildingAddress || String(building.id) || 'Unknown Building'
      await bcfTopicsManager?.downloadBCF(buildingName)
    } catch (error) {
      console.error('Failed to export BCF:', error)
    }
  }, [bcfTopicsManager, building])

  const handleImportBCF = React.useCallback(async () => {
    try {
      const result = await bcfTopicsManager?.uploadBCF()
      const {topics, viewpoints} = result || {topics: [], viewpoints: []}
      topics.map((topic: OBC.Topic, index) => {
        // topic.viewpoints.add(viewpoints[index].guid) // I AM NOT GETTING THE VIEWPOINTS
        // console.log('Imported topic:', topic)
            bimDispatch({
              type: 'ADD_BCF_TOPIC',
              payload: { bcfTopic: topic }
            })
          })
    } catch (error) {
      console.error('Failed to import BCF:', error)
    }
  }, [bcfTopicsManager, bimDispatch, bcfTopics])

  return (
    <>
      <CollapsibleSection
        title={t('topicsTitle')}
        icon={BcfIcon}
        className="overflow-y-auto"
        itemCount={bcfTopics.length}
        onAddItem={handleAddTopic}
        addItemTitle={t('addTopicTitle')}
      >
        {/* BCF Operations */}
        <div className="flex gap-2 mb-3 mx-2 overflow-x-hidden ">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBCF}
            className="text-xs"
            title={t('exportBCFTitle')}
            disabled={!ability.can('read', 'File')}
          >
            <LR.Download className="h-3 w-3 mr-1" />
            {t('exportBCF')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportBCF}
            className="text-xs"
            title={t('importBCFTitle')}
            disabled={!ability.can('create', 'File')}
          >
            <LR.Upload className="h-3 w-3 mr-1" />
            {t('importBCF')}
          </Button>
        </div>

        <div className="space-y-2 mx-2 pr-2">
          {bcfTopics.map((topic) => (
            <CollapsibleTopicItem
              key={topic.guid}
              topic={topic}
              onAction={handleAction}
            />
          ))}
        </div>
      </CollapsibleSection>

      <CreateTopicDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleDialogSubmit}
        existingTopic={editingTopic}
      />
    </>
  )
}