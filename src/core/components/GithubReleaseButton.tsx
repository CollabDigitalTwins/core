'use client'

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from 'react'
import { Github, ArrowUpRight, Sparkles } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from './ui/Dialog'
import { Logo } from './Logo'

const GH_URL = 'https://github.com/CollabDigitalTwins/core'
/** Open-source release — July 1, 2026 (local time). Until then the repository
 * is private, so the GitHub button shows a countdown dialog instead of linking.
 * After July 1 this can be simplified to a plain link. */
const RELEASE_DATE = new Date(2026, 6, 1)

function daysUntilRelease(): number {
  return Math.ceil((RELEASE_DATE.getTime() - new Date().getTime()) / 86_400_000)
}

interface GithubReleaseButtonProps {
  isCollapsed?: boolean
}

export default function GithubReleaseButton({ isCollapsed = false }: GithubReleaseButtonProps) {
  const [days, setDays] = React.useState(0)
  const [released, setReleased] = React.useState(false)

  // Compute on the client only to avoid an SSR/hydration mismatch.
  React.useEffect(() => {
    const remaining = daysUntilRelease()
    setDays(Math.max(0, remaining))
    setReleased(remaining <= 0)
  }, [])

  const label = 'GitHub'

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Collab Digital Twins source on GitHub"
          className={`text-xs flex items-center gap-2 w-full rounded-md hover:bg-muted/50 transition-colors ${
            isCollapsed ? 'justify-center p-2' : 'justify-start p-2'
          }`}
        >
          <Github className="h-4 w-4" />
          <span className={isCollapsed ? 'hidden' : 'inline'}>{label}</span>
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-w-md border-0 p-0 overflow-hidden text-center"
        closeClass="text-white/70 hover:text-white"
      >
        <div
          className="relative px-8 py-12"
          style={{
            background:
              'linear-gradient(140deg, #2a1150 0%, #5a2570 35%, #8f3a50 68%, #b4532e 100%)',
          }}
        >
          {/* Soft glow accent over the gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)',
            }}
            aria-hidden
          />

          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Logo width={34} height={34} />
            </div>

            {released ? (
              <>
                <DialogTitle className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.35em] text-white/80 mb-4">
                  <Sparkles className="w-4 h-4" aria-hidden />
                  It&apos;s here!
                </DialogTitle>
                <p
                  className="font-bold text-white mb-7"
                  style={{ fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', lineHeight: 1.2 }}
                >
                  Collab Digital Twins&apos; open-source code is finally released — and it&apos;s all
                  yours.
                </p>
                <a
                  href={GH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold bg-white text-[#2a1150] transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <Github className="w-4 h-4" aria-hidden />
                  View source on GitHub
                  <ArrowUpRight className="w-4 h-4" aria-hidden />
                </a>
              </>
            ) : (
              <>
                <DialogTitle className="text-xs font-bold uppercase tracking-[0.35em] text-white/70 mb-4">
                  Open-source soon
                </DialogTitle>
                <div className="flex items-baseline justify-center gap-2.5 mb-3">
                  <span
                    className="font-bold text-white"
                    style={{ fontSize: 'clamp(3rem, 12vw, 4.5rem)', lineHeight: 1 }}
                  >
                    {days}
                  </span>
                  <span className="font-semibold text-white/80 text-xl">
                    {days === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <p className="text-white/90 text-base leading-relaxed max-w-xs mx-auto">
                  to the release on July 1st
                </p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
