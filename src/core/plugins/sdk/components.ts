'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

// Re-export shadcn/ui primitives that plugins can use
// This is the approved set — plugins should not import from @/src/core/components/ui directly
export { Button } from '../../../core/components/ui/Button'
export { Input } from '../../../core/components/ui/Input'
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '../../../core/components/ui/Dialog'
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../core/components/ui/Card'
export { Badge } from '../../../core/components/ui/Badge'
export { Separator } from '../../../core/components/ui/Separator'
