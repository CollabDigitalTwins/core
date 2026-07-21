"use client"

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Shadcn Components
import * as LR from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import * as React from 'react'

import { Button, Badge, Separator } from '../../../../components/ui/'
import { Card, CardContent } from '../../../../components/ui/Card'
import { DescriptionListItem } from '../../../../components/ui/DescriptionList'

import { useFastDatasetCache } from './src/useFastDatasetCache'

import type { Dataset } from '../../../../types/datasetTypes'

interface DatasetDetailsProps {
  selectedDataset?: Dataset
}

export default function DatasetDetails({ selectedDataset }: DatasetDetailsProps) {
  // Translation
  const t = useTranslations('DatasetDetails')

  const [featuresData, setFeaturesData] = React.useState<any>(null)
  const [featuresLoading, setFeaturesLoading] = React.useState(false)
  const { getFromCache } = useFastDatasetCache()

  React.useEffect(() => {
    let isMounted = true

    if (!selectedDataset) {
      setFeaturesData(null)
      return
    }

    setFeaturesLoading(true)

    getFromCache(selectedDataset).then((data) => {
      if (isMounted) {
        setFeaturesData(data)
      }
    }).catch(err => {
      console.error('Failed to load dataset features:', err)
      if (isMounted) setFeaturesData(null)
    }).finally(() => {
      if (isMounted) setFeaturesLoading(false)
    })

    return () => { isMounted = false }
  }, [selectedDataset, getFromCache])

  // console.log("Features Data:", featuresData);

  return (
    <div className="flex flex-col p-6 sm:h-[718px] overflow-y-auto max-h-[80vh]">
      {/* 2 column headers */}
      <div className="grid grid-cols-1 gap-3 md:gap-6 py-3 border-t border-border">
        <DescriptionListItem label="Url">
          <Link
            href={selectedDataset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            {selectedDataset.url}
          </Link>
        </DescriptionListItem>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 py-3 border-t border-border">
        <DescriptionListItem label={t('publisherLabel')}>
          {selectedDataset.publisher || t('noPublisher')}
        </DescriptionListItem>
        <Separator className="md:hidden" />
        <DescriptionListItem label={t('licenseLabel')}>
          {selectedDataset.license
            ? (
                getLicense(selectedDataset.license)
              )
            : t('noLicense')}
        </DescriptionListItem>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 py-3 border-t border-border">
        <DescriptionListItem label={t('email')} className={`${selectedDataset.contact ? 'underline' : ''}`}>
          {selectedDataset.contact || t('noEmail')}
        </DescriptionListItem>
        <Separator className="md:hidden" />
        <DescriptionListItem label={t('typeLabel')}>
          {selectedDataset.type}
        </DescriptionListItem>
      </div>

      {(selectedDataset.dateReleased || selectedDataset.dateUpdated) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 py-3 border-t border-border">
          <DescriptionListItem label={t('dateReleasedLabel')}>
            {formatDate(selectedDataset.dateReleased) || t('noDateReleased')}
          </DescriptionListItem>
          <Separator className="md:hidden" />
          <DescriptionListItem label={t('dateUpdatedLabel')}>
            {formatDate(selectedDataset.dateUpdated) || t('noDateUpdated')}
          </DescriptionListItem>
        </div>
      )}

      {featuresData && featuresData.editingInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 py-3 border-t border-border">
          <DescriptionListItem label={t('lastEditDateLabel')}>
            {featuresLoading
              ? t('loading')
              : (featuresData?.editingInfo?.lastEditDate
                  ? formatDate(featuresData.editingInfo.lastEditDate)
                  : t('unknown'))}
          </DescriptionListItem>
          <Separator className="md:hidden" />
          <DescriptionListItem label={t('dataLastEditDateLabel')}>
            {featuresLoading
              ? t('loading')
              : (featuresData?.editingInfo?.dataLastEditDate
                  ? formatDate(featuresData.editingInfo.dataLastEditDate)
                  : t('unknown'))}
          </DescriptionListItem>
        </div>
      )}

      {/* Full width headers */}
      <div className="grid grid-cols-1 gap-3 md:gap-6 py-3 border-t border-border">
        <DescriptionListItem label={t('keywordsLabel')} className="flex gap-2">
          {selectedDataset.keywords && selectedDataset.keywords.length > 0
            ? (
                selectedDataset.keywords.map((keyword, index) => (
                  <Badge className="max-h-10 flex cursor-pointer items-start max-w-[120px] truncate" title={keyword} key={index}>
                    {keyword}
                  </Badge>
                ))
              )
            : (
                <Badge>
                  Keyword
                </Badge>
              )}
        </DescriptionListItem>
      </div>
      <div className="grid grid-cols-1 gap-3 md:gap-6 py-3 border-t border-border">
        <DescriptionListItem label={t('descriptionLabel')}>
          {selectedDataset.description || t('noDescription')}
        </DescriptionListItem>
      </div>

      {/* Files */}
      {selectedDataset.files && selectedDataset.files.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:gap-6 py-3 border-t border-border">
          <DescriptionListItem label="Data and Resources">
            <div className="flex flex-col md:flex-row gap-2 md:gap-6 w-full">
              <Card className="w-full">
                <CardContent className="p-4 md:p-6 flex items-center gap-3">
                  <LR.File className="w-4 h-4 text-foreground shrink-0" />
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-card-foreground underline">
                        Placeholder
                      </span>
                    </div>
                    <Button variant="outline" className="hidden md:!flex">
                      Explore
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="md:hidden"
                    >
                      <LR.Download />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DescriptionListItem>
        </div>
      )}
    </div>
  )
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown'
  // Parse ISO string and format as YYYY-MM-DD
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toISOString().slice(0, 10)
}

function getLicense(license: string) {
  // Extract URL from HTML or use as is
  const htmlRegex = /<a[^>]+href=['"]([^'"]+)['"][^>]*>(.*?)<\/a>/i
  const match = htmlRegex.exec(license)
  if (match) {
    return (
      <a
        href={match[1]}
        target="_blank"
        rel="nofollow ugc noopener noreferrer"
        className="underline text-blue-600"
      >
        {match[2] || match[1]}
      </a>
    )
  }
  // If it's a plain URL string
  const urlRegex = /^https?:\/\/[^\s]+$/i
  if (urlRegex.test(license)) {
    return (
      <a
        href={license}
        target="_blank"
        rel="nofollow ugc noopener noreferrer"
        className="underline text-blue-600"
      >
        {license}
      </a>
    )
  }
  // Otherwise, just show as text
  return license
}
