// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

/** Run a side-effect helper; log and swallow errors so one failure can't
 *  abort the surrounding sequence. Used in tool activate/deactivate paths
 *  where every cleanup step needs to run independently. */
export function safeRun(fn: () => void, label: string) {
  try {
    fn()
  } catch (error) {
    console.warn(`[${label}] failed:`, error)
  }
}

/** Async variant — awaits the promise and swallows rejections. */
export async function safeRunAsync(
  fn: () => Promise<unknown>,
  label: string,
): Promise<void> {
  try {
    await fn()
  } catch (error) {
    console.warn(`[${label}] failed:`, error)
  }
}
