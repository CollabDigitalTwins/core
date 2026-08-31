'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

/**
 * Arrow-key movement between a search input and the options it opened, using real focus so
 * Enter activates the option natively and screen readers follow along.
 */
export function useOptionListKeys(count: number) {
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const optionsRef = React.useRef<(HTMLElement | null)[]>([])

    const focusOption = React.useCallback((index: number) => {
        const clamped = Math.min(Math.max(index, 0), count - 1)
        optionsRef.current[clamped]?.focus()
    }, [count])

    const optionRef = React.useCallback(
        (index: number) => (element: HTMLElement | null) => { optionsRef.current[index] = element },
        [],
    )

    const onInputKeyDown = React.useCallback((event: React.KeyboardEvent) => {
        if (event.key !== 'ArrowDown' || count === 0) return
        event.preventDefault()
        focusOption(0)
    }, [count, focusOption])

    const onOptionKeyDown = React.useCallback(
        (index: number) => (event: React.KeyboardEvent) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                focusOption(index + 1)
                return
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault()
                // Leaving the top of the list returns to the input rather than trapping focus.
                if (index === 0) inputRef.current?.focus()
                else focusOption(index - 1)
                return
            }
            if (event.key === 'Escape') {
                event.preventDefault()
                inputRef.current?.focus()
            }
        },
        [focusOption],
    )

    return { inputRef, optionRef, onInputKeyDown, onOptionKeyDown }
}
