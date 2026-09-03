/**
 * Fixed-timestep loop with an accumulator.
 *
 * Physics must not vary with frame rate: level solvability is verified
 * headlessly and replayed from recorded solutions, so a shot that clears a
 * level on a 120Hz phone has to clear it on a 30Hz one too.
 */

/** Simulation rate. Changing this changes every tuned constant in the game. */
export const TICK_HZ = 60
export const TICK_SECONDS = 1 / TICK_HZ

/**
 * Longest frame the accumulator will honour. A backgrounded tab reports a
 * multi-second frame; without this clamp the loop tries to catch up in one
 * go, blocks, and reports an even longer frame (the spiral of death).
 */
export const MAX_FRAME_SECONDS = 0.25

export interface LoopState {
  /** Leftover simulation time not yet consumed by a tick. */
  readonly accumulator: number
  /** Total ticks stepped since the loop started. */
  readonly tick: number
}

export const INITIAL_LOOP_STATE: LoopState = { accumulator: 0, tick: 0 }

export interface AdvanceResult {
  readonly state: LoopState
  /** How far between the last tick and the next one, for render interpolation. */
  readonly alpha: number
  /** Ticks stepped during this frame. */
  readonly stepped: number
}

/**
 * Pure: given loop state and a frame duration, decide how many fixed steps to
 * run. Kept free of rAF and the DOM so determinism is unit-testable.
 */
export function advance(
  state: LoopState,
  frameSeconds: number,
  step: (tick: number) => void,
): AdvanceResult {
  const clamped = Math.min(Math.max(frameSeconds, 0), MAX_FRAME_SECONDS)
  let accumulator = state.accumulator + clamped
  let tick = state.tick
  let stepped = 0

  while (accumulator >= TICK_SECONDS) {
    step(tick)
    tick += 1
    stepped += 1
    accumulator -= TICK_SECONDS
  }

  return { state: { accumulator, tick }, alpha: accumulator / TICK_SECONDS, stepped }
}

export interface LoopHandle {
  stop(): void
}

/** Drives `advance` from requestAnimationFrame. */
export function startLoop(
  step: (tick: number) => void,
  render: (alpha: number) => void,
): LoopHandle {
  let state = INITIAL_LOOP_STATE
  let last = performance.now()
  let frame = requestAnimationFrame(onFrame)

  function onFrame(now: number): void {
    const result = advance(state, (now - last) / 1000, step)
    last = now
    state = result.state
    render(result.alpha)
    frame = requestAnimationFrame(onFrame)
  }

  return {
    stop() {
      cancelAnimationFrame(frame)
    },
  }
}
