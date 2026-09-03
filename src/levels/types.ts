import type { ShapeSpec } from '../physics/bodies'

export type Vec3 = readonly [number, number, number]

export type Look = 'ground' | 'stone' | 'roof' | 'crate'

export interface ObjectSpec {
  readonly shape: ShapeSpec
  readonly position: Vec3
  /** Purely visual. Physics treats every piece of terrain identically. */
  readonly look?: Look
  /** Static scenery when false. Structures the shot can move are true. */
  readonly dynamic?: boolean
  readonly density?: number
  readonly friction?: number
  readonly restitution?: number
}

export interface TargetSpec extends ObjectSpec {
  /** Accumulated impact above the damage threshold needed to destroy this. */
  readonly health: number
  /** Bonus targets are the third star, never required to win (SPEC 2.2). */
  readonly bonus?: boolean
}

export interface BuildZone {
  readonly min: Vec3
  readonly max: Vec3
}

export interface InventoryEntry {
  readonly part: string
  readonly count: number
}

/**
 * A recorded solution, used only by the solvability tests.
 *
 * Every shipped level carries one. It is the guard against the failure mode
 * that matters most with no QA team: a physics or tuning change that quietly
 * makes level 17 impossible, discovered by a player rather than by CI.
 */
export interface LevelSolution {
  readonly placements: readonly { readonly part: string; readonly position: Vec3; readonly rotationZ: number }[]
  readonly aim: Vec3
  readonly power: number
}

export interface LevelSpec {
  readonly id: string
  readonly name: string
  readonly launcher: { readonly position: Vec3; readonly maxSpeed: number }
  /** Anything falling below this is destroyed, targets included. */
  readonly killLineY: number
  /** Parts used at or below par earns the second star. */
  readonly par: number
  readonly inventory: readonly InventoryEntry[]
  readonly buildZones: readonly BuildZone[]
  readonly terrain: readonly ObjectSpec[]
  readonly structures: readonly ObjectSpec[]
  readonly targets: readonly TargetSpec[]
  readonly solution?: LevelSolution
}
