import { describe, it, expect } from 'vitest';
import { fitFor, ramRequiredBytes, MODEL_CATALOG } from './model-capability';

const GB = 1024 ** 3;

describe('ramRequiredBytes', () => {
  it('adds runtime overhead for text models', () => {
    expect(ramRequiredBytes(4 * GB)).toBeCloseTo(4 * GB * 1.2, -6);
  });
  it('adds the vision encoder on top for vision models', () => {
    expect(ramRequiredBytes(4 * GB, true)).toBeCloseTo(4 * GB * 1.2 + 1.5 * GB, -6);
  });
});

describe('fitFor', () => {
  it('marks a small model comfortable on 16GB', () => {
    expect(fitFor({ modelBytes: 2 * GB, totalRamBytes: 16 * GB })).toBe('comfortable');
  });

  it('treats llava on a 16GB Mac as having capacity (idle) for both text and vision', () => {
    // reserve = 25% of 16 = 4GB; usable = 12GB.
    // text: required 4.7*1.2 = 5.64GB <= 70% of 12 (8.4) -> comfortable.
    expect(fitFor({ modelBytes: 4.7 * GB, totalRamBytes: 16 * GB })).toBe('comfortable');
    // vision: required 5.64 + 1.5 = 7.14GB <= 8.4 -> still comfortable as capacity.
    // (The real OOM was transient load, surfaced by the runtime crash hint, not this badge.)
    expect(fitFor({ modelBytes: 4.7 * GB, totalRamBytes: 16 * GB, isVision: true })).toBe('comfortable');
  });

  it("marks a model larger than usable RAM as won't-fit", () => {
    // 30GB model on a 16GB machine.
    expect(fitFor({ modelBytes: 30 * GB, totalRamBytes: 16 * GB })).toBe('wont-fit');
  });

  it('moondream fits an 8GB Mac for vision where llava-vision would not', () => {
    // reserve = max(2, 25% of 8 = 2) = 2GB; usable = 6GB.
    // moondream vision: 1.7*1.2 + 1.5 = 3.54GB <= 70% of 6 (4.2) -> comfortable.
    expect(fitFor({ modelBytes: 1.7 * GB, totalRamBytes: 8 * GB, isVision: true })).toBe('comfortable');
    // llava vision: 7.14GB > usable 6 -> won't fit on 8GB.
    expect(fitFor({ modelBytes: 4.7 * GB, totalRamBytes: 8 * GB, isVision: true })).toBe('wont-fit');
  });

  it('flags a borderline model as tight (runs, little headroom)', () => {
    // 16GB machine, usable 12GB. Pick a text model whose required lands in (8.4, 12].
    // 9GB file -> required 10.8GB -> tight.
    expect(fitFor({ modelBytes: 9 * GB, totalRamBytes: 16 * GB })).toBe('tight');
  });

  it("returns won't-fit when usable RAM is effectively zero", () => {
    expect(fitFor({ modelBytes: 1 * GB, totalRamBytes: 1 * GB })).toBe('wont-fit');
  });

  it('classifies just inside each tier band (16GB: usable 12GB, 70%=8.4GB)', () => {
    // Test with clear margin either side of the boundaries — an exact float-boundary
    // assertion is itself imprecise (1.2/0.7 aren't binary-exact), so we pin behavior
    // just inside each band instead.
    expect(fitFor({ modelBytes: 6.5 * GB, totalRamBytes: 16 * GB })).toBe('comfortable'); // req 7.8 < 8.4
    expect(fitFor({ modelBytes: 7.5 * GB, totalRamBytes: 16 * GB })).toBe('tight');        // req 9.0 in (8.4,12]
    expect(fitFor({ modelBytes: 10.5 * GB, totalRamBytes: 16 * GB })).toBe('wont-fit');     // req 12.6 > 12
  });
});

describe('MODEL_CATALOG', () => {
  it('lists moondream first as the low-RAM vision option', () => {
    expect(MODEL_CATALOG[0].id).toBe('moondream');
    expect(MODEL_CATALOG[0].vision).toBe(true);
  });
  it('every entry has an id, positive size, and note', () => {
    for (const m of MODEL_CATALOG) {
      expect(m.id).toBeTruthy();
      expect(m.sizeBytes).toBeGreaterThan(0);
      expect(m.note).toBeTruthy();
    }
  });
});
