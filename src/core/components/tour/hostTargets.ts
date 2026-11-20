// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** The selector for `data-tour="<name>"`, with quotes and backslashes in the name escaped. */
export const anchorSelector = (name: string) => `[data-tour="${name.replace(/["\\]/g, '\\$&')}"]`

/** The element marked `data-tour="<name>"`, or null. */
export const findAnchor = <T extends HTMLElement = HTMLElement>(name: string, root: ParentNode = document) =>
  root.querySelector<T>(anchorSelector(name))

type Lookup = Pick<Document, 'querySelectorAll' | 'getElementById'>

/** The app sidebar's button for a page, matched on its title, which stays in the text while the sidebar is collapsed. */
export function findSidebarPageLink(title: string, lookup: Pick<Document, 'querySelectorAll'> = document): HTMLElement | null {
  return Array.from(lookup.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]'))
    .find(button => button.textContent?.trim() === title) ?? null
}

/** Opens or closes the toolbar dropdown holding `element` by clicking the toggle that controls it. */
export function setToolbarPanel(element: Element | null, open: boolean, lookup: Lookup = document): void {
  if (!element) return
  const toggle = Array.from(lookup.querySelectorAll<HTMLElement>('[aria-controls]'))
    .find(t => lookup.getElementById(t.getAttribute('aria-controls') ?? '')?.contains(element))
  if (toggle && (toggle.getAttribute('aria-expanded') === 'true') !== open) toggle.click()
}
