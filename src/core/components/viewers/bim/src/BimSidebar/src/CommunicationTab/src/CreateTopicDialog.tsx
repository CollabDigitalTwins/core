'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import * as OBC from '@thatopen/components'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../../../../ui/Dialog'
import { Button } from '../../../../../../../ui/Button'
import { Input } from '../../../../../../../ui/Input'
import { Label } from '../../../../../../../ui/Label'
import { Textarea } from '../../../../../../../ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../../../ui/Select'
import { Calendar } from '../../../../../../../ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../../../../../../ui/Popover'
import { Checkbox } from '../../../../../../../ui/Checkbox'
import { Badge } from '../../../../../../../ui/Badge'
import * as LR from 'lucide-react'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { cn } from '../../../../../../../../utils/utils'

export interface BCFTopicFormData {
  title: string
  description: string
  topicType: string
  topicStatus: string
  priority: string
  stage: string
  assignedTo: string
  dueDate: Date | null
  labels: string[]
  referenceLinks: string[]
}

interface CreateTopicDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: BCFTopicFormData) => void
  existingTopic?: OBC.Topic | Partial<OBC.Topic> | null // Optional topic for edit mode
}

// Predefined options based on BCF standards and common usage
const TOPIC_TYPES = [
  'Clash',
  'Issue',
  'Request',
  'Information',
  'Coordination',
  'Design',
  'Error',
  'Remark',
  'Question',
  'Warning'
]

const TOPIC_STATUSES = [
  'Active',
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
  'Done',
  'In Review',
  'Rejected'
]

const PRIORITIES = [
  'Low',
  'Normal',
  'High',
  'Critical',
  'Major',
  'Minor'
]

const STAGES = [
  'Design',
  'Construction',
  'Operations',
  'Planning',
  'Tender',
  'Preconstruction',
  'Handover'
]

const COMMON_LABELS = [
  'Architecture',
  'Structure',
  'MEP',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Cost Estimation',
  'Safety',
  'Quality',
  'Schedule',
  'Coordination',
  'RFI'
]

export function CreateTopicDialog({ open, onOpenChange, onSubmit, existingTopic }: CreateTopicDialogProps) {
  const t = useTranslations('TopicsSection')

  const [formData, setFormData] = React.useState<BCFTopicFormData>({
    title: '',
    description: '',
    topicType: 'Issue',
    topicStatus: 'Active',
    priority: 'Normal',
    stage: 'Design',
    assignedTo: '',
    dueDate: null,
    labels: [],
    referenceLinks: []
  })

  const [newLabel, setNewLabel] = React.useState('')
  const [newReferenceLink, setNewReferenceLink] = React.useState('')
  const [dueDateOpen, setDueDateOpen] = React.useState(false)

  // Pre-populate form data when editing
  React.useEffect(() => {
    if (existingTopic) {
      const topic = existingTopic

      // Handle date conversion more robustly
      let parsedDueDate: Date | null = null
      if (topic.dueDate) {
        try {
          if (topic.dueDate instanceof Date) {
            parsedDueDate = topic.dueDate
          } else if (typeof topic.dueDate === 'string') {
            parsedDueDate = new Date(topic.dueDate)
          } else {
            parsedDueDate = new Date(topic.dueDate as any)
          }
          // Check if date is valid
          if (isNaN(parsedDueDate.getTime())) {
            parsedDueDate = null
          }
        } catch (error) {
          parsedDueDate = null
        }
      }

      setFormData({
        title: String(topic.title || ''),
        description: String(topic.description || ''),
        topicType: String(topic.type || 'Issue'),
        topicStatus: String(topic.status || 'Active'),
        priority: String(topic.priority || 'Normal'),
        stage: String(topic.stage || 'Design'),
        assignedTo: String(topic.assignedTo || ''),
        dueDate: parsedDueDate,
        labels: topic.labels ? (Array.isArray(topic.labels) ? topic.labels : Array.from(topic.labels)) : [],
        referenceLinks: []
      })
    } else {
      // Reset form for create mode
      setFormData({
        title: '',
        description: '',
        topicType: 'Issue',
        topicStatus: 'Active',
        priority: 'Normal',
        stage: 'Design',
        assignedTo: '',
        dueDate: null,
        labels: [],
        referenceLinks: []
      })
    }
  }, [existingTopic, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields - ensure title is a string before calling trim
    const title = String(formData.title || '')
    if (!title.trim()) {
      return
    }

    onSubmit(formData)

    // Reset form
    setFormData({
      title: '',
      description: '',
      topicType: 'Issue',
      topicStatus: 'Active',
      priority: 'Normal',
      stage: 'Design',
      assignedTo: '',
      dueDate: null,
      labels: [],
      referenceLinks: []
    })
    setNewLabel('')
    setNewReferenceLink('')
    onOpenChange(false)
  }

  const handleInputChange = (field: keyof BCFTopicFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addLabel = (label: string) => {
    if (label && !formData.labels.includes(label)) {
      handleInputChange('labels', [...formData.labels, label])
    }
  }

  const removeLabel = (labelToRemove: string) => {
    handleInputChange('labels', formData.labels.filter(label => label !== labelToRemove))
  }

  const addReferenceLink = () => {
    if (newReferenceLink && !formData.referenceLinks.includes(newReferenceLink)) {
      handleInputChange('referenceLinks', [...formData.referenceLinks, newReferenceLink])
      setNewReferenceLink('')
    }
  }

  const removeReferenceLink = (linkToRemove: string) => {
    handleInputChange('referenceLinks', formData.referenceLinks.filter(link => link !== linkToRemove))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingTopic ? t('editTopicTitle') : t('createTopicTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">{t('requiredFields')}</h3>

            {/* Title - Required */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('topicTitle')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder={t('topicTitlePlaceholder')}
                required
              />
            </div>

            {/* Type - Required */}
            <div className="space-y-2">
              <Label htmlFor="type">{t('topicType')} *</Label>
              <Select value={formData.topicType} onValueChange={(value) => handleInputChange('topicType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPIC_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status - Required */}
            <div className="space-y-2">
              <Label htmlFor="status">{t('topicStatus')} *</Label>
              <Select value={formData.topicStatus} onValueChange={(value) => handleInputChange('topicStatus', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPIC_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">{t('optionalFields')}</h3>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('topicDescription')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('topicDescriptionPlaceholder')}
                rows={3}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">{t('topicPriority')}</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage */}
            <div className="space-y-2">
              <Label htmlFor="stage">{t('topicStage')}</Label>
              <Select value={formData.stage} onValueChange={(value) => handleInputChange('stage', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo">{t('topicAssignedTo')}</Label>
              <Input
                id="assignedTo"
                type="email"
                value={formData.assignedTo}
                onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                placeholder={t('topicAssignedToPlaceholder')}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>{t('topicDueDate')}</Label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <LR.Calendar className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, 'PPP') : t('topicDueDatePlaceholder')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate || undefined}
                    onSelect={(date) => {
                      handleInputChange('dueDate', date || null)
                      setDueDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <Label>{t('topicLabels')}</Label>
              <div className="space-y-2">
                {/* Current labels */}
                {formData.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.labels.map((label) => (
                      <Badge key={label} variant="secondary" className="flex items-center gap-1">
                        {label}
                        <button
                          type="button"
                          onClick={() => removeLabel(label)}
                          className="ml-1 hover:text-destructive"
                        >
                          <LR.X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Quick add common labels */}
                <div className="flex flex-wrap gap-2">
                  {COMMON_LABELS
                    .filter(label => !formData.labels.includes(label))
                    .slice(0, 6)
                    .map((label) => (
                      <Button
                        key={label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addLabel(label)}
                      >
                        <LR.Plus className="h-3 w-3 mr-1" />
                        {label}
                      </Button>
                    ))}
                </div>

                {/* Custom label input */}
                <div className="flex gap-2">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={t('topicLabelsPlaceholder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addLabel(newLabel)
                        setNewLabel('')
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      addLabel(newLabel)
                      setNewLabel('')
                    }}
                  >
                    <LR.Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Reference Links */}
            <div className="space-y-2">
              <Label>{t('topicReferenceLinks')}</Label>
              <div className="space-y-2">
                {/* Current links */}
                {formData.referenceLinks.length > 0 && (
                  <div className="space-y-2">
                    {formData.referenceLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <LR.Link className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate">{link}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReferenceLink(link)}
                        >
                          <LR.X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new link */}
                <div className="flex gap-2">
                  <Input
                    value={newReferenceLink}
                    onChange={(e) => setNewReferenceLink(e.target.value)}
                    placeholder={t('topicReferenceLinksPlaceholder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addReferenceLink()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addReferenceLink}
                  >
                    <LR.Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={!String(formData.title || '').trim()}>
              {existingTopic ? t('updateTopic') : t('createTopic')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
