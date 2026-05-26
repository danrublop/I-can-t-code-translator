// Region screenshot for vision queries (runtime, macOS).
//
// Uses the built-in `screencapture -i` (interactive region select) — the native crosshair
// users already know (eng review E2). Needs Screen Recording permission. Returns the saved
// PNG path, or null if the user pressed Escape (cancelled). execFile + fixed args, no shell.

import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const run = promisify(execFile);

export interface ScreenshotResult {
  /** Absolute path to the captured PNG, or null if cancelled. */
  path: string | null;
}

/**
 * Prompt the user to drag-select a screen region and capture it to a temp PNG.
 * `-i` interactive, `-r` no window shadow/region, `-x` no capture sound.
 * If the user cancels, screencapture writes no file -> we return { path: null }.
 */
export async function captureRegion(): Promise<ScreenshotResult> {
  const out = join(tmpdir(), `notch-shot-${Date.now()}.png`);
  try {
    await run('screencapture', ['-i', '-r', '-x', out], { timeout: 120000 });
  } catch (e) {
    // Timeout / screencapture error: don't leak a partial file in tmpdir.
    if (existsSync(out)) { try { rmSync(out); } catch { /* ignore */ } }
    throw e;
  }
  if (existsSync(out) && statSync(out).size > 0) {
    return { path: out };
  }
  // Cancelled: clean up any zero-byte artifact.
  if (existsSync(out)) rmSync(out);
  return { path: null };
}
