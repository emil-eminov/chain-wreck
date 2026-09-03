import RAPIER from '@dimforge/rapier3d-compat'
import { TICK_SECONDS } from '../core/loop'

/** 1 world unit = 1 metre. Every tuned constant assumes this. */
export const GRAVITY = { x: 0, y: -9.81, z: 0 }

/**
 * Gameplay is confined to a shallow slab in Z (SPEC 2.6). Bodies may topple
 * within it, but nothing gameplay-relevant depends on judging depth.
 */
export const SLAB_HALF_DEPTH = 0.75

let ready = false

/** Loads the Rapier WASM. Safe to call more than once. */
export async function initPhysics(): Promise<void> {
  if (ready) return
  await RAPIER.init()
  ready = true
}

export function createWorld(): RAPIER.World {
  if (!ready) throw new Error('initPhysics() must be awaited before createWorld()')
  const world = new RAPIER.World(GRAVITY)
  world.timestep = TICK_SECONDS
  return world
}

export { RAPIER }
