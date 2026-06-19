// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { useTranslations } from 'next-intl'

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

interface ConfirmDialogProps {
    isOpen: boolean
    isDeleting: boolean
    onOpenChange: (open: boolean) => void
    handleConfirm: (e: React.MouseEvent) => void
    itemName?: string
    dataType?: string
}

export default function ConfirmDialog({ isOpen, isDeleting, onOpenChange, handleConfirm, itemName, dataType }: ConfirmDialogProps) {
    const t = useTranslations('ConfirmDialog')
    
    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('alertTitle')} {dataType || t('item')}?</AlertDialogTitle>
                <AlertDialogDescription>
                {t('alertDescription')}
                {' '}
                <strong>{itemName || t('defaultName')}</strong>
                ?
                {' '}
                {t('confirmLabel')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                onClick={handleConfirm}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
                >
                {isDeleting ? <LoadingSpinner /> : t('delete')}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}