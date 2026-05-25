// macOS CaptureProvider wiring (runtime).
//
// Builds the hybrid provider (tested in capture.ts) with mac-specific deps:
//   - triggerCopy: synthesize Cmd+C via `osascript` System Events keystroke (needs
//     Accessibility permission — same permission the accessibility path will use).
//   - getSourceApp: frontmost app name via `osascript`, used for auto-tagging.
//   - readAccessibilitySelection: TODO — wire the `selection-hook` library here (E1).
//     Until then it returns null and we fall back to synthetic copy, which the hybrid
//     provider handles (clipboard is always restored).
//
// Shells out with execFile + fixed arguments (no shell, no user input) so there is no
// command-injection surface.

import { execFile } from 'child_process';
import { promisify } from 'util';
import { clipboard } from 'electron';
import { makeHybridProvider, type CaptureProvider, type CaptureResult } from './capture';

const run = promisify(execFile);

async function osascript(script: string): Promise<string> {
  const { stdout } = await run('osascript', ['-e', script], { timeout: 4000 });
  return stdout.trim();
}

/** Synthesize Cmd+C in the frontmost app. Throws a clear error if not permitted. */
async function triggerCopy(): Promise<void> {
  try {
    await osascript('tell application "System Events" to keystroke "c" using {command down}');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[capture] osascript keystroke failed:', msg);
    // 1002/-25211 = not trusted for Accessibility; -1743 = Automation not allowed.
    throw new Error(
      'Could not send Cmd+C. Grant Accessibility + Automation to this app in System Settings → Privacy & Security. (In dev, that\'s "Electron".) Original: ' + msg,
    );
  }
}

/** Name of the frontmost application, for tagging. Best-effort. */
async function getSourceApp(): Promise<string | undefined> {
  try {
    return (await osascript('tell application "System Events" to get name of first process whose frontmost is true')) || undefined;
  } catch {
    return undefined;
  }
}

// Placeholder for the native accessibility read (selection-hook). Returning null makes
// the hybrid provider fall back to synthetic copy.
async function readAccessibilitySelection(): Promise<CaptureResult | null> {
  return null;
}

let cachedSourceApp: string | undefined;

/**
 * Build the macOS capture provider. Source app is sampled just before capture so the
 * tag reflects the app the selection came from.
 */
export function createMacCaptureProvider(): CaptureProvider {
  const hybrid = makeHybridProvider({
    readAccessibilitySelection,
    clipboard,
    triggerCopy,
    getSourceApp: () => cachedSourceApp,
  });
  return {
    async captureSelection(): Promise<CaptureResult> {
      cachedSourceApp = await getSourceApp();
      const res = await hybrid.captureSelection();
      console.log(`[capture] via=${res.via} chars=${res.text.length} sourceApp=${res.sourceApp ?? '?'}`);
      return res;
    },
  };
}
