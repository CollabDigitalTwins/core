// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'
import * as React from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/AlertDialog'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export interface ConfirmDialogProps {
    isOpen: boolean
    /** Shows a spinner on the confirm button and disables it. */
    isDeleting?: boolean
    onOpenChange: (open: boolean) => void
    // Not awaited: the dialog closes when the caller flips `isOpen`.
    handleConfirm: (e: React.MouseEvent) => void | Promise<void>
    itemName?: string
    dataType?: string
    /** Copy for a question that is not a delete. Each falls back to the delete wording. */
    title?: string
    description?: React.ReactNode
    confirmLabel?: string
    cancelLabel?: string
    /** 'destructive' paints the confirm red; a question that destroys nothing passes 'default'. */
    tone?: 'destructive' | 'default'
}

export default function ConfirmDialog({
    isOpen,
    isDeleting = false,
    onOpenChange,
    handleConfirm,
    itemName,
    dataType,
    title,
    description,
    confirmLabel,
    cancelLabel,
    tone = 'destructive',
}: ConfirmDialogProps) {
    const t = useTranslations('ConfirmDialog')

    // Opened from a DropdownMenuItem, Radix's two body pointer-events locks can race and leave the page unclickable.
    React.useEffect(() => {
      if (isOpen) return
      const id = window.setTimeout(() => {
        document.body.style.pointerEvents = ''
      }, 0)
      return () => window.clearTimeout(id)
    }, [isOpen])

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{title ?? `${t('alertTitle')} ${dataType || t('item')}?`}</AlertDialogTitle>
                <AlertDialogDescription>
                {description ?? (
                    <>
                        {t('alertDescription')}
                        {' '}
                        <strong>{itemName || t('defaultName')}</strong>
                        ?
                        {' '}
                        {t('confirmLabel')}
                    </>
                )}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{cancelLabel ?? t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                onClick={(e) => { void handleConfirm(e) }}
                className={tone === 'destructive' ? 'bg-red-600 hover:bg-red-700' : undefined}
                disabled={isDeleting}
                >
                {isDeleting ? <LoadingSpinner /> : confirmLabel ?? t('delete')}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}