// On-device OCR (runtime, macOS).
//
// Shells out to the bundled `ocr` helper (build-resources/ocr.swift, Apple Vision
// framework) to pull text out of an image with NO model and NO network. Used by the
// "grab text from a screen region" capture path, which sidesteps vision-model RAM cost.
//
// execFile + fixed args (the only argument is an absolute image path we created), no shell.

import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const run = promisify(execFile);

/**
 * Resolve the OCR helper path. Packaged: extraResources copies it to
 * Contents/Resources/ocr. Dev: build-resources/ocr (built by `npm run build:ocr`).
 * Passed in so the service stays free of an electron import (and unit-testable).
 */
export function resolveOcrBinary(opts: { isPackaged: boolean; resourcesPath: string; appPath: string }): string {
  return opts.isPackaged
    ? `${opts.resourcesPath}/ocr`
    : `${opts.appPath}/build-resources/ocr`;
}

/**
 * Recognize text in an image. Returns the recognized text (possibly empty) or throws a
 * clear error if the helper is missing or fails.
 */
export async function recognizeText(binaryPath: string, imagePath: string): Promise<string> {
  if (!existsSync(binaryPath)) {
    throw new Error('Text recognition helper not found. Rebuild with `npm run build:ocr`.');
  }
  try {
    const { stdout } = await run(binaryPath, [imagePath], { timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
    return stdout.trim();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Text recognition failed: ${msg}`);
  }
}
