// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import type * as React from 'react'

/**
 * The UI primitives core lends a plugin, as types.
 *
 * Core's own barrel (`plugins-sdk/components`) re-exports shadcn components whose
 * props come from `@radix-ui/*` and `class-variance-authority`. Those are restated
 * by hand here so a plugin does not have to install Radix to typecheck a `<Button>`.
 *
 * Restating means these can drift from core. They are the single definition of the
 * declared shape — `sdkModules.d.ts` builds the ambient module out of this file
 * rather than repeating it — so that core's `pluginKitComponents.test.ts` can
 * import them by path and assert, at compile time, that every prop declared here
 * still exists on the real component with the same type. Drift fails in core, where
 * it originates.
 *
 * Where a shape is deliberately narrower than the real one, it says so. The rule
 * the test enforces is one-directional: the kit may omit a prop, but it may never
 * declare one core does not have, or type one differently.
 */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  active?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}
export type ButtonComponent = React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>

export type InputProps = React.ComponentPropsWithoutRef<'input'>
export type InputComponent = React.ForwardRefExoticComponent<
  InputProps & React.RefAttributes<HTMLInputElement>
>

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}
export type BadgeComponent = (props: BadgeProps) => React.ReactElement

/**
 * Narrower than the real separator, which also accepts `asChild` and the rest of
 * the underlying primitive's props. These two are the ones core acts on.
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  /** False announces the separator to assistive technology. */
  decorative?: boolean
}
export type SeparatorComponent = React.ForwardRefExoticComponent<
  SeparatorProps & React.RefAttributes<HTMLDivElement>
>

/** Every part of Card is a plain div that forwards its ref. */
export type CardProps = React.HTMLAttributes<HTMLDivElement>
export type CardComponent = React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
>

export interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
  children?: React.ReactNode
}
export type DialogComponent = (props: DialogProps) => React.ReactElement

export interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}
export type DialogTriggerComponent = React.ForwardRefExoticComponent<
  DialogTriggerProps & React.RefAttributes<HTMLButtonElement>
>

/**
 * The dismissal callbacks the underlying primitive also accepts
 * (`onEscapeKeyDown`, `onInteractOutside`, …) are deliberately not declared: their
 * parameter types come from the dialog primitive's own package, and a plugin must
 * not have to install it. `closeClass` styles the built-in close button.
 */
export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  closeClass?: string
}
export type DialogContentComponent = React.ForwardRefExoticComponent<
  DialogContentProps & React.RefAttributes<HTMLDivElement>
>

export type DialogSectionProps = React.HTMLAttributes<HTMLDivElement>
export type DialogSectionComponent = (props: DialogSectionProps) => React.ReactElement

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean
}
export type DialogTitleComponent = React.ForwardRefExoticComponent<
  DialogTitleProps & React.RefAttributes<HTMLHeadingElement>
>

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean
}
export type DialogDescriptionComponent = React.ForwardRefExoticComponent<
  DialogDescriptionProps & React.RefAttributes<HTMLParagraphElement>
>
