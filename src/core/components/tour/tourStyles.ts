// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** The tour's stylesheet; `:where` keeps the defaults overridable by any class that sets a `--tour-*` variable. */
export const TOUR_CSS = `
:where(.cdt-tour) {
  --tour-surface: hsl(var(--card, 0 0% 100%));
  --tour-text: hsl(var(--card-foreground, 0 0% 3.9%));
  --tour-ink: var(--tour-text);
  --tour-muted: hsl(var(--border, 0 0% 89.8%));
  --tour-accent: var(--hp-primary-container, #c05520);
  --tour-accent-strong: color-mix(in srgb, var(--tour-accent) 75%, black);
  --tour-on-accent: var(--hp-on-primary-ctr, #ffffff);
  --tour-header-bg: var(--tour-accent);
  --tour-header-fg: var(--tour-on-accent);
  --tour-scrim: rgba(0, 0, 0, 0.45);
  --tour-ring: var(--tour-accent);
  --tour-focus: hsl(var(--ring, 0 0% 3.9%));
}
.cdt-tour { position: fixed; inset: 0; z-index: var(--tour-z, 2147483000); pointer-events: none; color: var(--tour-ink); }
.cdt-tour * { box-sizing: border-box; }
[data-tour] { scroll-margin-top: 64px; }

.cdt-tour-scrim { position: fixed; inset: 0; z-index: 9; background: var(--tour-scrim); }
.cdt-tour-spot { position: fixed; z-index: 9; border-radius: 10px; background: var(--tour-scrim); box-shadow: 0 0 0 9999px var(--tour-scrim); }
.cdt-tour-spot.is-settled { background: transparent; transition: background 280ms ease-out; }
.cdt-tour-ring { position: fixed; z-index: 11; border-radius: 10px; border: 2px solid var(--tour-ring); box-shadow: 0 0 0 6px color-mix(in srgb, var(--tour-accent) 35%, transparent); opacity: 0; }
.cdt-tour-ring.is-settled { opacity: 1; transition: opacity 280ms ease-out; animation: cdt-tour-pulse 2s ease-in-out 280ms infinite; }
@keyframes cdt-tour-pulse { 50% { box-shadow: 0 0 0 11px color-mix(in srgb, var(--tour-accent) 15%, transparent); } }
.cdt-tour-arrow { position: fixed; z-index: 11; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--tour-accent); color: var(--tour-on-accent); font-size: 1.25rem; font-weight: 700; line-height: 1; box-shadow: 0 6px 18px color-mix(in srgb, var(--tour-ink) 35%, transparent); opacity: 0; }
.cdt-tour-arrow.is-settled { opacity: 1; transition: opacity 280ms ease-out; animation: cdt-tour-nudge 1.2s ease-in-out 280ms infinite; }
@keyframes cdt-tour-nudge { 50% { transform: translateX(-6px); } }

.cdt-tour-hide { position: fixed; z-index: 9; top: 12px; left: 50%; transform: translateX(-50%); pointer-events: auto; display: inline-flex; align-items: center; gap: 0.45rem; border: none; border-radius: 999px; background: var(--tour-accent); color: var(--tour-on-accent); font: inherit; font-size: 0.8rem; font-weight: 600; padding: 0.5rem 0.95rem; cursor: pointer; box-shadow: 0 6px 18px color-mix(in srgb, var(--tour-ink) 35%, transparent); }
.cdt-tour-hide:hover { background: var(--tour-accent-strong); }
.cdt-tour-hide span { font-size: 1rem; line-height: 1; }

.cdt-tour-card { position: fixed; z-index: 9; width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow-x: hidden; overflow-y: auto; pointer-events: auto; background: var(--tour-surface); border-radius: 12px; box-shadow: 0 18px 48px color-mix(in srgb, var(--tour-ink) 35%, transparent); opacity: 0; transform: translateY(6px); }
.cdt-tour-card.is-settled { opacity: 1; transform: none; transition: opacity 220ms ease-out, transform 220ms ease-out; }
.cdt-tour-card > header { position: relative; overflow: hidden; display: flex; align-items: center; gap: 0.75rem; background: var(--tour-header-bg); color: var(--tour-header-fg); padding: 0.7rem 1rem; border-radius: 12px 12px 0 0; }
.cdt-tour-shortcut { padding: 0.2rem 0.6rem; border: 1px solid color-mix(in srgb, var(--tour-header-fg) 55%, transparent); border-radius: 999px; background: none; font: inherit; font-size: 0.75rem; font-weight: 600; color: inherit; cursor: pointer; white-space: nowrap; }
.cdt-tour-shortcut:hover { background: color-mix(in srgb, var(--tour-header-fg) 15%, transparent); }
.cdt-tour-card > header small { margin-left: auto;font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.85; }

.cdt-tour-body { padding: 0.9rem 1rem 0.4rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem; line-height: 1.45; color: var(--tour-text); }
.cdt-tour-body h3 { display: flex; flex-direction: column; gap: 0.35rem; margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--tour-ink); }
.cdt-tour-body h3::before { content: ''; display: block; width: 2.25rem; height: 4px; background: var(--tour-accent); }
.cdt-tour-body p { margin: 0; }
.cdt-tour-menu-path { display: inline-flex; align-items: center; gap: 0.25em; font-weight: 600; color: var(--tour-ink); white-space: nowrap; }
.cdt-tour-menu-path svg { width: 1em; height: 1em; }
.cdt-tour-body dl { margin: 0; display: grid; gap: 0.35rem; }
.cdt-tour-body dt { font-weight: 600; color: var(--tour-accent); }
.cdt-tour-body dd { margin: 0; }
.cdt-tour-items { list-style: none; margin: 0 -0.4rem; padding: 0; display: grid; gap: 0.15rem; }
.cdt-tour-item { display: grid; grid-template-columns: 2rem 1fr auto; align-items: center; column-gap: 0.65rem; width: 100%; padding: 0.4rem; border: 1px solid transparent; border-radius: 8px; background: none; font: inherit; color: inherit; text-align: left; }
button.cdt-tour-item { cursor: pointer; }
button.cdt-tour-item:hover { border-color: var(--tour-muted); background: color-mix(in srgb, var(--tour-accent) 7%, transparent); }
.cdt-tour-item-icon { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 6px; background: color-mix(in srgb, var(--tour-accent) 12%, transparent); color: var(--tour-accent); }
.cdt-tour-item-icon svg { width: 1.05rem; height: 1.05rem; }
.cdt-tour-item-text { display: flex; flex-direction: column; min-width: 0; }
.cdt-tour-item-text strong { font-weight: 600; color: var(--tour-accent); }
.cdt-tour-item-go { font-size: 1.2rem; line-height: 1; color: var(--tour-accent); opacity: 0.6; }
button.cdt-tour-item:hover .cdt-tour-item-go { opacity: 1; }
.cdt-tour-waiting { display: grid; gap: 0.35rem; }
.cdt-tour-waiting > span:not(.cdt-tour-sr) { height: 0.55rem; border-radius: 999px; background: linear-gradient(90deg, var(--tour-muted) 25%, color-mix(in srgb, var(--tour-muted) 40%, var(--tour-surface)) 50%, var(--tour-muted) 75%); background-size: 200% 100%; animation: cdt-tour-shimmer 1.2s linear infinite; }
.cdt-tour-waiting > span:nth-child(2) { width: 60%; }
@keyframes cdt-tour-shimmer { to { background-position: -200% 0; } }
.cdt-tour-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.cdt-tour-card > footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.6rem 1rem 0.9rem; }
.cdt-tour-dots { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.cdt-tour-dots button { width: 8px; height: 8px; padding: 0; border: none; border-radius: 999px; background: var(--tour-muted); cursor: pointer; }
.cdt-tour-dots button[aria-current='step'] { width: 18px; background: var(--tour-accent); }
.cdt-tour-actions { display: flex; gap: 0.4rem; margin-left: auto; }
.cdt-tour-actions button { font: inherit; font-size: 0.8rem; font-weight: 600; border-radius: 6px; padding: 0.4rem 0.8rem; white-space: nowrap; cursor: pointer; }
.cdt-tour-back { background: none; border: 1px solid var(--tour-muted); color: var(--tour-ink); }
.cdt-tour-back:disabled { opacity: 0.4; cursor: default; }
.cdt-tour-next { background: var(--tour-accent); border: 1px solid var(--tour-accent); color: var(--tour-on-accent); }
.cdt-tour-next:hover { background: var(--tour-accent-strong); border-color: var(--tour-accent-strong); }
.cdt-tour button:focus-visible { outline: 2px solid var(--tour-focus); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .cdt-tour-spot.is-settled, .cdt-tour-ring.is-settled, .cdt-tour-arrow.is-settled, .cdt-tour-card.is-settled, .cdt-tour-waiting > span { transition: none; animation: none; }
  .cdt-tour-card { transform: none; }
}
`
