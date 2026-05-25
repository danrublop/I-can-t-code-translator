// Selection capture (eng review E1/E5).
//
// Strategy: try the native accessibility path first (via the `selection-hook` library,
// wired in the real provider), and fall back to a synthetic Cmd+C that NEVER destroys
// the user's clipboard. selection-hook is kept behind the CaptureProvider interface so
// it can be swapped for a custom native helper later without touching callers.
//
// Capture is ON-DEMAND only (eng review E4): we read the selection when the hotkey
// fires, never via continuous monitoring — better battery, and the app never inspects
// a selection the user didn't ask about.
//
// This file holds the interface plus the clipboard-fallback orchestration. The fallback
// is written against injected Clipboard + triggerCopy + sleep so every branch (including
// the "clipboard is restored" guarantee) is unit-testable without a real OS.

export interface CaptureResult {
  /** Selected text, or empty string if nothing could be read. */
  text: string;
  /** Frontmost app bundle id / name, if known (used for auto-tagging). */
  sourceApp?: string;
  /** Which path produced the result — for observability. */
  via: 'accessibility' | 'clipboard' | 'none';
}

export interface CaptureProvider {
  /** Read the current selection on demand. Resolves with empty text if none. */
  captureSelection(): Promise<CaptureResult>;
}

/** Minimal clipboard surface (Electron's `clipboard` satisfies this). */
export interface Clipboard {
  readText(): string;
  writeText(text: string): void;
  clear(): void;
}

export interface ClipboardCaptureOptions {
  /** ms to wait after the synthetic copy for the focused app to write the clipboard. */
  captureDelayMs?: number;
  /** Injected sleep so tests run instantly. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Capture the selection by simulating Cmd+C, reading the clipboard, then restoring the
 * user's original clipboard contents. Always restores, even when nothing was selected
 * or when an error is thrown mid-flight.
 *
 * @param clipboard    clipboard to read/write/clear
 * @param triggerCopy  fires the synthetic copy (real impl sends Cmd+C); resolves when sent
 * @param sourceApp    frontmost app, if the caller already knows it
 */
export async function captureViaClipboard(
  clipboard: Clipboard,
  triggerCopy: () => Promise<void>,
  sourceApp?: string,
  options: ClipboardCaptureOptions = {},
): Promise<CaptureResult> {
  const sleep = options.sleep ?? defaultSleep;
  const delay = options.captureDelayMs ?? 150;

  // Save the user's clipboard so we can put it back no matter what happens.
  const saved = clipboard.readText();
  try {
    // Clear first so a stale value isn't mistaken for the selection.
    clipboard.clear();
    await triggerCopy();
    await sleep(delay);
    const captured = clipboard.readText();
    const text = captured.trim();
    if (text.length === 0) {
      return { text: '', sourceApp, via: 'none' };
    }
    return { text: captured, sourceApp, via: 'clipboard' };
  } finally {
    // Restore the original clipboard. This runs on success, empty, and error paths.
    clipboard.writeText(saved);
  }
}

/**
 * Compose an accessibility-first provider with a clipboard fallback. Tries the native
 * read; if it yields no text, falls back to synthetic copy. The accessibility reader and
 * triggerCopy are injected so the real provider supplies selection-hook + a key sender.
 */
export function makeHybridProvider(deps: {
  readAccessibilitySelection: () => Promise<CaptureResult | null>;
  clipboard: Clipboard;
  triggerCopy: () => Promise<void>;
  getSourceApp?: () => string | undefined;
  options?: ClipboardCaptureOptions;
}): CaptureProvider {
  return {
    async captureSelection(): Promise<CaptureResult> {
      const sourceApp = deps.getSourceApp?.();
      try {
        const ax = await deps.readAccessibilitySelection();
        if (ax && ax.text.trim().length > 0) {
          return { ...ax, sourceApp: ax.sourceApp ?? sourceApp, via: 'accessibility' };
        }
      } catch {
        // Accessibility unavailable or denied — fall through to clipboard.
      }
      return captureViaClipboard(deps.clipboard, deps.triggerCopy, sourceApp, deps.options);
    },
  };
}
