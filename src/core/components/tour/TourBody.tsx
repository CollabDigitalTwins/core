// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

/** Splits a `term — description` line so the term can be set in bold; other lines have no term. */
export function splitTerm(line: string): [string | null, string] {
  const at = line.indexOf(' — ')
  return at > 0 ? [line.slice(0, at), line.slice(at + 3)] : [null, line]
}

type Block = string | [string, string][]

function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const line of text.split('\n')) {
    const [term, description] = splitTerm(line)
    const last = blocks[blocks.length - 1]
    if (term === null) blocks.push(description)
    else if (Array.isArray(last)) last.push([term, description])
    else blocks.push([[term, description]])
  }
  return blocks
}

/** A step's body: strings become paragraphs and definition lists, anything else renders as given. */
export function TourBody({ body }: { body: React.ReactNode }) {
  if (typeof body !== 'string') return <>{body}</>
  return (
    <>
      {toBlocks(body).map((block, i) => (typeof block === 'string'
        ? <p key={i}>{block}</p>
        : <dl key={i}>{block.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl>))}
    </>
  )
}
