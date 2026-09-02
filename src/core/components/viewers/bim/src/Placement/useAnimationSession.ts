'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'

import { BimContext } from '../../../../../store/BIM/context'

import { AnimationSession } from './AnimationSession'

import type { AnimationSessionState } from './AnimationSession'

/** Mirrors the live animation session into React. The component owns it; this reads. */
export function useAnimationSession(): AnimationSessionState | null {
  const { state } = React.useContext(BimContext)
  const { bimComponents } = state.bim
  const [session, setSession] = React.useState<AnimationSessionState | null>(null)

  React.useEffect(() => {
    if (!bimComponents) {
      setSession(null)
      return
    }

    const owner = bimComponents.get(AnimationSession)
    const publish = (next: AnimationSessionState | null) => setSession(next)
    setSession(owner.active)

    owner.onChanged.add(publish)
    return () => owner.onChanged.remove(publish)
  }, [bimComponents])

  return session
}
