import { describe, expect, it } from 'vitest'
import {
  INITIAL_LOOP_STATE,
  MAX_FRAME_SECONDS,
  TICK_SECONDS,
  advance,
} from '../../src/core/loop'

/** Deterministic pseudo-random frame times, so the test does not rely on wall clock. */
function frameTimes(seed: number, count: number): number[] {
  let x = seed
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    x = (x * 1664525 + 1013904223) % 4294967296
    // 4ms to 36ms, i.e. a phone bouncing between 30 and 240fps
    out.push(0.004 + (x / 4294967296) * 0.032)
  }
  return out
}

/** Toy simulation whose result depends on tick count and order. */
function run(frames: number[]): { ticks: number; checksum: number } {
  let state = INITIAL_LOOP_STATE
  let checksum = 0
  for (const frame of frames) {
    const result = advance(state, frame, (tick) => {
      checksum = (checksum * 31 + tick) % 1000000007
    })
    state = result.state
  }
  return { ticks: state.tick, checksum }
}

describe('fixed-timestep loop', () => {
  it('produces identical results for identical input', () => {
    const frames = frameTimes(12345, 600)
    expect(run(frames)).toEqual(run(frames))
  })

  it('steps the same number of ticks regardless of how time is chopped up', () => {
    const oneSecondSmoothly = run(new Array(60).fill(1 / 60))
    const oneSecondLumpy = run([0.2, 0.05, 0.1, 0.25, 0.1, 0.15, 0.15])
    expect(oneSecondSmoothly.ticks).toBe(60)
    expect(oneSecondLumpy.ticks).toBe(60)
  })

  it('clamps a long frame instead of trying to catch up all at once', () => {
    let stepped = 0
    advance(INITIAL_LOOP_STATE, 30, () => {
      stepped += 1
    })
    expect(stepped).toBe(Math.floor(MAX_FRAME_SECONDS / TICK_SECONDS))
  })

  it('reports alpha inside the unit interval', () => {
    let state = INITIAL_LOOP_STATE
    for (const frame of frameTimes(999, 200)) {
      const result = advance(state, frame, () => {})
      expect(result.alpha).toBeGreaterThanOrEqual(0)
      expect(result.alpha).toBeLessThan(1)
      state = result.state
    }
  })

  it('ignores negative frame times', () => {
    const result = advance(INITIAL_LOOP_STATE, -5, () => {
      throw new Error('should not step')
    })
    expect(result.state).toEqual(INITIAL_LOOP_STATE)
  })
})
