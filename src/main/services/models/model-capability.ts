// "Can this model actually run on your computer?" heuristic + a curated pull catalog.
//
// macOS reports almost no "free" memory (it uses RAM for cache), so os.freemem() is
// useless for this. We estimate against TOTAL physical RAM with an OS reserve instead —
// the standard "you need ~8GB for a 7B model" rule of thumb.
//
//   required ≈ modelFileBytes × 1.2   (weights + KV cache / runtime overhead)
//            + 1.5GB if vision         (the CLIP / mmproj image encoder loads on top)
//   usable   = totalRAM − reserve, reserve = max(2GB, 25% of total) so it scales
//             from an 8GB laptop to a 64GB workstation.
//
//   comfortable : required ≤ 70% of usable
//   tight       : required ≤ usable        (runs on an idle machine, little headroom)
//   wont-fit    : required > usable
//
// This is a CAPACITY estimate: "can this hardware run the model when otherwise idle?"
// It can't see transient load — e.g. llava-vision on a 16GB Mac is capacity-comfortable,
// but will still OOM if Chrome is already eating 12GB. That transient case is handled at
// runtime by the actionable "model runner stopped — free RAM / try moondream / use cloud"
// error, not by this badge.
//
// Pure module: RAM is passed in, so it's unit-tested without touching the OS.

export type Fit = 'comfortable' | 'tight' | 'wont-fit';

const GB = 1024 ** 3;
const MIN_RESERVE_BYTES = 2 * GB;
const RESERVE_FRACTION = 0.25;
const RUNTIME_OVERHEAD = 1.2;
const VISION_ENCODER_BYTES = 1.5 * GB;

/** Estimated RAM a model needs to run, in bytes. */
export function ramRequiredBytes(modelBytes: number, isVision = false): number {
  return modelBytes * RUNTIME_OVERHEAD + (isVision ? VISION_ENCODER_BYTES : 0);
}

export interface FitInput {
  /** Model file size on disk (Ollama reports this for installed models). */
  modelBytes: number;
  /** Total physical RAM (os.totalmem()). */
  totalRamBytes: number;
  /** Vision models load an extra image encoder — account for it. */
  isVision?: boolean;
}

/** Classify whether a model fits in this machine's RAM (capacity, idle machine). */
export function fitFor({ modelBytes, totalRamBytes, isVision = false }: FitInput): Fit {
  const reserve = Math.max(MIN_RESERVE_BYTES, totalRamBytes * RESERVE_FRACTION);
  const usable = totalRamBytes - reserve;
  const required = ramRequiredBytes(modelBytes, isVision);
  if (usable <= 0) return 'wont-fit';
  if (required <= usable * 0.7) return 'comfortable';
  if (required <= usable) return 'tight';
  return 'wont-fit';
}

/** Human-friendly one-liner for a fit result. */
export function fitLabel(fit: Fit): string {
  switch (fit) {
    case 'comfortable': return 'Runs comfortably';
    case 'tight': return 'Runs, but tight on RAM';
    case 'wont-fit': return "Won't fit in RAM";
  }
}

export interface CatalogModel {
  /** Ollama pull id. */
  id: string;
  label: string;
  /** Approximate download / on-disk size in bytes. */
  sizeBytes: number;
  vision: boolean;
  note: string;
}

// Curated recommendations for the Models page. Sizes are approximate (the quantized
// default tag). moondream is first because it's the low-RAM vision answer to the
// llava-OOM problem.
export const MODEL_CATALOG: readonly CatalogModel[] = [
  { id: 'moondream',         label: 'Moondream',        sizeBytes: 1.7 * GB, vision: true,  note: 'Tiny vision model — for low-RAM Macs that OOM on llava' },
  { id: 'llava:latest',      label: 'LLaVA 7B',         sizeBytes: 4.7 * GB, vision: true,  note: 'General vision; needs roughly 8GB+ of free RAM' },
  { id: 'llama3.2:latest',   label: 'Llama 3.2 3B',     sizeBytes: 2.0 * GB, vision: false, note: 'Fast, light general-purpose text' },
  { id: 'mistral:latest',    label: 'Mistral 7B',       sizeBytes: 4.1 * GB, vision: false, note: 'Solid general-purpose text' },
  { id: 'qwen2.5-coder:7b',  label: 'Qwen2.5 Coder 7B', sizeBytes: 4.7 * GB, vision: false, note: 'Tuned for code questions' },
];
