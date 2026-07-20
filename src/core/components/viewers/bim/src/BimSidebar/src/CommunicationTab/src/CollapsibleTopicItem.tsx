'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Button } from '../../../../../../../ui/Button'
import { Badge } from '../../../../../../../ui/Badge'
import { Separator } from '../../../../../../../ui/Separator'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { cn } from '../../../../../../../../utils/utils'
import type * as OBC from '@thatopen/components'

type TopicAction = 'view' | 'edit' | 'delete'

interface CollapsibleTopicItemProps {
  topic: OBC.Topic
  onAction: (action: TopicAction, id: string) => void
}

export function CollapsibleTopicItem({ topic, onAction }: CollapsibleTopicItemProps) {
  const t = useTranslations('TopicsSection')
  const [isExpanded, setIsExpanded] = React.useState(false)

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'destructive'
      case 'major':
        return 'default'
      case 'normal':
        return 'secondary'
      case 'minor':
      case 'low':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'open':
        return 'default'
      case 'in progress':
        return 'secondary'
      case 'resolved':
      case 'done':
        return 'outline'
      case 'closed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Collapsed Header */}
      <div className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <LR.ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </Button>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">
              {topic.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusColor(topic.status)} className="text-xs">
                {topic.status}
              </Badge>
              <Badge variant={getPriorityColor(topic.priority)} className="text-xs">
                {topic.priority || 'Normal'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {topic.type}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Always Visible */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => onAction('view', topic.guid)}
            title={t('viewTopicTitle')}
          >
            <LR.Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => onAction('edit', topic.guid)}
            title={t('editTopicTitle')}
          >
            <LR.Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => onAction('delete', topic.guid)}
            title={t('deleteTopicTitle')}
          >
            <LR.Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t bg-muted/30">
          <div className="p-4 space-y-4">
            {/* Description */}
            {topic.description && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t('topicDescription')}
                </h5>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {topic.description}
                </p>
              </div>
            )}

            {/* Topic Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('topicType')}
                  </h5>
                  <p className="text-sm text-foreground">{topic.type}</p>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('topicStage')}
                  </h5>
                  <p className="text-sm text-foreground">{topic.stage || t('notSpecified')}</p>
                </div>

                {topic.assignedTo && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {t('topicAssignedTo')}
                    </h5>
                    <p className="text-sm text-foreground">{topic.assignedTo}</p>
                  </div>
                )}
              </div>

              {/* Dates and Status */}
              <div className="space-y-3">
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('topicCreationDate')}
                  </h5>
                  <p className="text-sm text-foreground">
                    {topic.creationDate ? format(topic.creationDate, 'PPP') : t('notSpecified')}
                  </p>
                </div>

                {topic.dueDate && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {t('topicDueDate')}
                    </h5>
                    <p className="text-sm text-foreground">
                      {format(topic.dueDate, 'PPP')}
                    </p>
                  </div>
                )}

                <div>
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    {t('topicCreationAuthor')}
                  </h5>
                  <p className="text-sm text-foreground">{topic.creationAuthor || t('notSpecified')}</p>
                </div>
              </div>
            </div>

            {/* Labels */}
            {topic.labels && topic.labels.size > 0 && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t('topicLabels')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {Array.from(topic.labels).map((label) => (
                    <Badge key={label} variant="outline" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Topic GUID (for debugging/reference) */}
            <Separator />
            <div>
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {t('topicDescription')}
              </h5>
              <p className="text-xs text-muted-foreground font-mono">
                {topic.description || t('notSpecified')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
