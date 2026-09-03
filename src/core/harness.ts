/**
 * Debug surface used by the Playwright performance and smoke tests.
 *
 * This exists because the performance budget (SPEC 7) is enforced as a test in
 * CI rather than eyeballed, and a browser test needs a way to ask the running
 * game how it is doing. It is intentionally tiny and read-mostly.
 */
export interface FrameStats {
  readonly frames: number
  readonly maxMs: number
  readonly p95Ms: number
  readonly drawCalls: number
  readonly bodies: number
  /** Mean cost of one physics step, in ms. Hardware-honest even without a GPU. */
  readonly stepMs: number
}

export interface DebugHarness {
  /** Drops `count` dynamic boxes into the scene to load-test the frame budget. */
  stress(count: number): void
  /** Frame statistics since the last `resetStats()`. */
  stats(): FrameStats
  resetStats(): void
}

declare global {
  interface Window {
    __chainwreck?: DebugHarness
  }
}

const SAMPLE_LIMIT = 600

export class FrameSampler {
  private samples: number[] = []

  record(ms: number): void {
    if (this.samples.length >= SAMPLE_LIMIT) this.samples.shift()
    this.samples.push(ms)
  }

  reset(): void {
    this.samples = []
  }

  summary(): { frames: number; maxMs: number; p95Ms: number } {
    if (this.samples.length === 0) return { frames: 0, maxMs: 0, p95Ms: 0 }
    const sorted = [...this.samples].sort((a, b) => a - b)
    const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))
    return {
      frames: sorted.length,
      maxMs: sorted[sorted.length - 1] ?? 0,
      p95Ms: sorted[index] ?? 0,
    }
  }
}
