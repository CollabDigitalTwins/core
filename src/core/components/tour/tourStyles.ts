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

.cdt-tour-card { position: fixed; z-index: 12; width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overflow-x: hidden; overflow-y: auto; pointer-events: auto; background: var(--tour-surface); border-radius: 12px; box-shadow: 0 18px 48px color-mix(in srgb, var(--tour-ink) 35%, transparent); opacity: 0; transform: translateY(6px); }
.cdt-tour-card.is-settled { opacity: 1; transform: none; transition: opacity 220ms ease-out, transform 220ms ease-out; }
.cdt-tour-card > header { position: sticky; top: 0; z-index: 1; overflow: hidden; display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.75rem; background: var(--tour-header-bg); color: var(--tour-header-fg); padding: 0.7rem 1rem; border-radius: 12px 12px 0 0; }
.cdt-tour-shortcut { padding: 0.2rem 0.6rem; border: 1px solid color-mix(in srgb, var(--tour-header-fg) 55%, transparent); border-radius: 999px; background: none; font: inherit; font-size: 0.75rem; font-weight: 600; color: inherit; cursor: pointer; min-width: 0; text-align: left; }
.cdt-tour-shortcut:hover { background: color-mix(in srgb, var(--tour-header-fg) 15%, transparent); }
.cdt-tour-sections-open { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; margin: -4px 0; padding: 0; border: none; border-radius: 6px; background: none; color: inherit; cursor: pointer; }
.cdt-tour-sections-open:hover, .cdt-tour-sections-back:hover { background: color-mix(in srgb, var(--tour-header-fg) 15%, transparent); }
.cdt-tour-sections-open svg { width: 18px; height: 18px; }
.cdt-tour-card > header small { margin-left: auto; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.85; }

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

.cdt-tour-card > footer { position: sticky; bottom: 0; background: var(--tour-surface); border-radius: 0 0 12px 12px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.6rem 1rem 0.9rem; }
.cdt-tour-dots { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.cdt-tour-dots button { width: 8px; height: 8px; padding: 0; border: none; border-radius: 999px; background: var(--tour-muted); cursor: pointer; }
.cdt-tour-dots button[aria-current='step'] { width: 18px; background: var(--tour-accent); }
.cdt-tour-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.4rem; min-width: 0; margin-left: auto; }
.cdt-tour-actions button { font: inherit; font-size: 0.8rem; font-weight: 600; border-radius: 6px; padding: 0.4rem 0.8rem; text-align: center; cursor: pointer; }
.cdt-tour-back { background: none; border: 1px solid var(--tour-muted); color: var(--tour-ink); }
.cdt-tour-back:disabled { opacity: 0.4; cursor: default; }
.cdt-tour-next { background: var(--tour-accent); border: 1px solid var(--tour-accent); color: var(--tour-on-accent); }
.cdt-tour-next:hover { background: var(--tour-accent-strong); border-color: var(--tour-accent-strong); }
.cdt-tour-sections { position: fixed; z-index: 12; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(880px, calc(100vw - 32px)); height: min(620px, calc(100vh - 32px)); height: min(620px, calc(100dvh - 32px)); display: flex; flex-direction: column; overflow: hidden; pointer-events: auto; background: var(--tour-surface); color: var(--tour-text); border-radius: 12px; box-shadow: 0 18px 48px color-mix(in srgb, var(--tour-ink) 40%, transparent); font-size: 0.85rem; line-height: 1.4; }
.cdt-tour-sections > header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.75rem; background: var(--tour-header-bg); color: var(--tour-header-fg); padding: 0.6rem 1rem 0.6rem 0.6rem; }
.cdt-tour-sections h2 { margin: 0; font-size: 1rem; font-weight: 600; }
.cdt-tour-sections > header small { margin-left: auto; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.85; }
.cdt-tour-sections-back { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.75rem 0.35rem 0.5rem; border: 1px solid color-mix(in srgb, var(--tour-header-fg) 55%, transparent); border-radius: 999px; background: none; font: inherit; font-size: 0.8rem; font-weight: 600; color: inherit; cursor: pointer; }
.cdt-tour-sections-back svg { width: 1rem; height: 1rem; }
.cdt-tour-sections-search { padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--tour-muted); }
.cdt-tour-sections-search input { width: 100%; font: inherit; padding: 0.6rem 0.75rem; border: 1px solid var(--tour-muted); border-radius: 8px; background: transparent; color: var(--tour-text); }
.cdt-tour-sections-search input:focus-visible { outline: 2px solid var(--tour-focus); outline-offset: 1px; }
.cdt-tour-sections-body { display: flex; flex: 1; min-height: 0; }
.cdt-tour-sections nav { flex: 0 0 270px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; padding: 0.6rem; border-right: 1px solid var(--tour-muted); }
.cdt-tour-section, .cdt-tour-section-step { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.55rem 0.65rem; border: 1px solid transparent; border-radius: 8px; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.cdt-tour-section:hover, .cdt-tour-section-step:hover { background: color-mix(in srgb, var(--tour-accent) 7%, transparent); }
.cdt-tour-section[aria-current] { border-color: var(--tour-muted); background: color-mix(in srgb, var(--tour-accent) 10%, transparent); }
.cdt-tour-section-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.cdt-tour-section-text small { font-size: 0.75rem; opacity: 0.75; }
.cdt-tour-section-dot { position: relative; flex-shrink: 0; width: 8px; height: 8px; border-radius: 999px; background: var(--tour-accent); }
.cdt-tour-sections-steps { flex: 1; min-width: 0; overflow-y: auto; padding: 1rem 1.25rem 1.25rem; }
.cdt-tour-sections-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.cdt-tour-sections-intro h3 { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--tour-ink); }
.cdt-tour-sections-intro h3::before { content: ''; display: block; width: 2.25rem; height: 4px; margin-bottom: 0.35rem; background: var(--tour-accent); }
.cdt-tour-sections-intro p { margin: 0.25rem 0 0; }
.cdt-tour-sections-intro .cdt-tour-next { flex-shrink: 0; font: inherit; font-size: 0.8rem; font-weight: 600; border-radius: 6px; padding: 0.4rem 0.8rem; cursor: pointer; }
.cdt-tour-sections-count { margin: 0 0 0.6rem; }
.cdt-tour-sections-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.cdt-tour-section-step[aria-current] { border-color: var(--tour-accent); background: color-mix(in srgb, var(--tour-accent) 8%, transparent); }
.cdt-tour-section-number { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: color-mix(in srgb, var(--tour-muted) 60%, transparent); }
.cdt-tour-section-step[aria-current] .cdt-tour-section-number { background: var(--tour-accent); color: var(--tour-on-accent); }
.cdt-tour-section-badge { flex-shrink: 0; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--tour-on-accent); background: var(--tour-accent); border-radius: 999px; padding: 0.2rem 0.55rem; }

.cdt-tour button:focus-visible { outline: 2px solid var(--tour-focus); outline-offset: 2px; }

@media (pointer: coarse) {
  .cdt-tour-dots { display: none; }
  .cdt-tour-actions button, .cdt-tour-hide { min-height: 44px; padding-inline: 1rem; }
  .cdt-tour-shortcut { min-height: 36px; }
  .cdt-tour-sections-open { min-width: 36px; min-height: 36px; }
  .cdt-tour-sections-back, .cdt-tour-section, .cdt-tour-section-step { min-height: 44px; }
}
@media (max-width: 767px) {
  .cdt-tour-hide { top: auto; bottom: 72px; }
  .cdt-tour-sections { inset: 0; transform: none; width: 100%; height: 100%; border-radius: 0; }
  .cdt-tour-sections-body { flex-direction: column; }
  .cdt-tour-sections nav { flex: none; flex-direction: row; overflow-x: auto; overflow-y: hidden; border-right: none; border-bottom: 1px solid var(--tour-muted); }
  .cdt-tour-section { width: auto; flex-shrink: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .cdt-tour-spot.is-settled, .cdt-tour-ring.is-settled, .cdt-tour-arrow.is-settled, .cdt-tour-card.is-settled, .cdt-tour-waiting > span { transition: none; animation: none; }
  .cdt-tour-card { transform: none; }
}
`
