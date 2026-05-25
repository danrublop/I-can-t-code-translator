import { defineConfig } from 'vitest/config';

// Unit tests for pure logic in the main process (notebook reconcile, model router,
// presets, capture clipboard restore). Electron/IPC-dependent code is not tested here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
