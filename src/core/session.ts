import type RAPIER from '@dimforge/rapier3d-compat'
import { createWorld } from '../physics/world'
import { LevelRuntime, type DespawnListener, type SpawnListener } from '../levels/runtime'
import { partById } from '../parts/registry'
import { validatePlacement, type Placement, type PlacementVerdict } from '../parts/placement'
import { starsFor } from './win'
import { transition, type Phase } from './state'
import type { LevelSpec, Vec3 } from '../levels/types'

export interface SessionHooks {
  /** Called before a rebuild so a renderer can drop everything it is drawing. */
  readonly onReset?: () => void
  readonly onSpawn?: SpawnListener
  readonly onDespawn?: DespawnListener
  readonly onPhase?: (phase: Phase) => void
}

export interface AttemptResult {
  readonly stars: number
  readonly partsUsed: number
  readonly par: number
  readonly bonusDestroyed: boolean
}

/** Radius and density of the single projectile. Heavier than it looks, on purpose. */
const PROJECTILE_RADIUS = 0.26
const PROJECTILE_DENSITY = 9

/**
 * Light damping on the projectile: enough to bleed off a roll, not enough to
 * shorten a shot. Tuned against two tests that pull in opposite directions,
 * "a direct hit destroys the target" and "resolves a miss promptly". Raising
 * this past about 0.3 starts failing the first one.
 */
const PROJECTILE_LINEAR_DAMPING = 0.15
const PROJECTILE_ANGULAR_DAMPING = 2

/**
 * One level attempt, from placing parts to the result card.
 *
 * Retry rebuilds the world from the level spec and replays the stored
 * placements, rather than trying to restore every body to where it started.
 * Rebuilding is the only version that is exactly reproducible, which matters
 * because recorded solutions are replayed as regression tests.
 */
export class Session {
  private runtime: LevelRuntime
  private placements: Placement[] = []
  private currentPhase: Phase = 'BUILD'

  constructor(
    readonly spec: LevelSpec,
    private readonly hooks: SessionHooks = {},
  ) {
    this.runtime = this.build()
  }

  private build(): LevelRuntime {
    this.hooks.onReset?.()
    return new LevelRuntime(
      createWorld(),
      this.spec,
      (info) => this.hooks.onSpawn?.(info),
      (body) => this.hooks.onDespawn?.(body),
    )
  }

  get phase(): Phase {
    return this.currentPhase
  }

  get world(): RAPIER.World {
    return this.runtime.world
  }

  get partsUsed(): number {
    return this.placements.reduce((total, p) => total + partById(p.partId).cost, 0)
  }

  /** How many of a part the player has left to place. */
  remaining(partId: string): number {
    const stocked = this.spec.inventory.find((entry) => entry.part === partId)?.count ?? 0
    return stocked - this.placements.filter((p) => p.partId === partId).length
  }

  check(partId: string, position: Vec3, rotationZ: number): PlacementVerdict {
    if (this.remaining(partId) <= 0) return 'blocked'
    return validatePlacement(this.runtime.world, partById(partId), position, rotationZ, this.spec.buildZones)
  }

  place(partId: string, position: Vec3, rotationZ: number): PlacementVerdict {
    if (this.currentPhase !== 'BUILD') return 'blocked'
    const verdict = this.check(partId, position, rotationZ)
    if (verdict !== 'ok') return verdict
    this.placements.push({ partId, position, rotationZ })
    this.spawnPart(this.placements[this.placements.length - 1]!)
    return 'ok'
  }

  private spawnPart(placement: Placement): void {
    const part = partById(placement.partId)
    this.runtime.spawn(
      {
        shape: part.shape,
        position: placement.position,
        dynamic: part.dynamic,
        rotationZ: placement.rotationZ,
        friction: part.friction,
        restitution: part.restitution,
        ...(part.density !== undefined ? { density: part.density } : {}),
      },
      'part',
    )
  }

  get lastPlacement(): Placement | undefined {
    return this.placements[this.placements.length - 1]
  }

  /** Removes the most recent placement. Cheaper to build than per-part picking. */
  undo(): boolean {
    if (this.currentPhase !== 'BUILD' || this.placements.length === 0) return false
    this.placements.pop()
    this.rebuild()
    return true
  }

  private rebuild(): void {
    this.runtime = this.build()
    for (const placement of this.placements) this.spawnPart(placement)
  }

  private setPhase(next: Phase): void {
    this.currentPhase = transition(this.currentPhase, next)
    this.hooks.onPhase?.(this.currentPhase)
  }

  beginAim(): void {
    this.setPhase('AIM')
  }

  cancelAim(): void {
    this.setPhase('BUILD')
  }

  /** Fires the single projectile. `direction` need not be normalised. */
  fire(direction: Vec3, power: number): void {
    if (this.currentPhase !== 'AIM') this.beginAim()
    const length = Math.hypot(...direction) || 1
    const speed = Math.min(Math.max(power, 0), 1) * this.spec.launcher.maxSpeed
    const body = this.runtime.spawn(
      {
        shape: { kind: 'sphere', radius: PROJECTILE_RADIUS },
        position: this.spec.launcher.position,
        dynamic: true,
        density: PROJECTILE_DENSITY,
        restitution: 0.12,
        friction: 0.9,
        linearDamping: PROJECTILE_LINEAR_DAMPING,
        angularDamping: PROJECTILE_ANGULAR_DAMPING,
        ccd: true,
      },
      'projectile',
    )
    body.setLinvel(
      { x: (direction[0] / length) * speed, y: (direction[1] / length) * speed, z: 0 },
      true,
    )
    this.runtime.beginAttempt()
    this.setPhase('SIMULATE')
  }

  /** One tick. Returns true once the attempt has resolved. */
  step(): boolean {
    if (this.currentPhase !== 'SIMULATE') return false
    this.runtime.step()
    const outcome = this.runtime.outcome
    if (outcome === 'PLAYING') return false
    this.setPhase('RESULT')
    return true
  }

  get result(): AttemptResult {
    return {
      stars: starsFor(this.runtime.outcome, this.partsUsed, this.spec.par, this.runtime.bonusDestroyed),
      partsUsed: this.partsUsed,
      par: this.spec.par,
      bonusDestroyed: this.runtime.bonusDestroyed,
    }
  }

  /** Back to BUILD with the placements intact, which is the point (SPEC 2.1). */
  retry(): void {
    this.setPhase('BUILD')
    this.rebuild()
  }

  get level(): LevelRuntime {
    return this.runtime
  }
}
