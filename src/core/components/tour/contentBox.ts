// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import { intersect } from './placement'

import type { Box } from './placement'

const MEDIA = 'svg, img, canvas, video, input, select, textarea'
const MIN_SIDE = 2

const toBox = ({ left, top, width, height }: DOMRect): Box => ({ left, top, width, height })

const visible = (box: Box) => box.width >= MIN_SIDE && box.height >= MIN_SIDE

function union(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map(b => b.left))
  const top = Math.min(...boxes.map(b => b.top))
  const right = Math.max(...boxes.map(b => b.left + b.width))
  const bottom = Math.max(...boxes.map(b => b.top + b.height))
  return { left, top, width: right - left, height: bottom - top }
}

/** Opacity 0 and `visibility: hidden` keep their layout box, as a collapsed sidebar's group labels do. */
function drawn(node: Element | null, root: Element): boolean {
  for (let current = node; current; current = current === root ? null : current.parentElement) {
    const style = getComputedStyle(current)
    if (style.opacity === '0' || style.visibility === 'hidden') return false
  }
  return true
}

function textBoxes(element: Element): Box[] {
  const range = element.ownerDocument.createRange()
  if (typeof range.getBoundingClientRect !== 'function') return []
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const boxes: Box[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || !drawn(node.parentElement, element)) continue
    range.selectNodeContents(node)
    boxes.push(toBox(range.getBoundingClientRect()))
  }
  return boxes
}

/** The box around what `element` visibly draws (icons, text, fields), which can sit off-centre in a padded button. */
export function contentBox(element: Element): Box | null {
  const own = toBox(element.getBoundingClientRect())
  const media = [...(element.matches(MEDIA) ? [element] : []), ...element.querySelectorAll(MEDIA)].filter(m => drawn(m, element))
  const boxes = [...media.map(m => toBox(m.getBoundingClientRect())), ...textBoxes(element)]
  return union(boxes.map(box => intersect(box, own)).filter((box): box is Box => box !== null && visible(box)))
}
