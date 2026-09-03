import type RAPIER from '@dimforge/rapier3d-compat'
import { RAPIER as R } from '../physics/world'
import { addBody, type BodySpec } from '../physics/bodies'
import { damageFromContactForce } from '../physics/damage'
import { evaluateOutcome, type Outcome } from '../core/win'
import type { LevelSpec, ObjectSpec, TargetSpec } from './types'

export type BodyRole = 'terrain' | 'structure' | 'target' | 'part' | 'projectile'

export interface SpawnInfo {
  readonly body: RAPIER.RigidBody
  readonly spec: BodySpec
  readonly role: BodyRole
  readonly look?: string
  /** Set for targets, so a renderer can flag the bonus one differently. */
  readonly bonus?: boolean
}

export interface TargetRuntime {
  readonly body: RAPIER.RigidBody
  readonly colliderHandle: number
  readonly maxHealth: number
  readonly bonus: boolean
  health: number
  destroyed: boolean
}

export type SpawnListener = (info: SpawnInfo) => void
export type DespawnListener = (body: RAPIER.RigidBody) => void

/**
 * Bodies slower than this, in metres per second, count as stopped.
 *
 * Deliberately generous. A ball trundling along at walking pace is not going
 * to knock anything over, and waiting for it to truly stop added seconds of
 * dead time to every miss. The cost is that a very slow nudge could in
 * principle be cut off; in practice such a nudge does no damage anyway,
 * because it lands far below the damage threshold.
 */
const SETTLED_SPEED = 0.55

/**
 * How far outside the level a body may travel before it is removed.
 *
 * Without this, a shot fired straight up at full power is airborne for over
 * five seconds, and the attempt cannot resolve until it lands. Despawning what
 * has left the playfield is also what keeps the body budget honest once debris
 * exists.
 */
const BOUNDS_HALF_WIDTH = 30
const BOUNDS_HEIGHT = 22

/**
 * Hard stop on a single attempt, in ticks.
 *
 * This is a backstop, not the normal path: the projectile is damped so it comes
 * to rest on its own. Before damping was added, a missed shot rolled for the
 * full cap and the result screen took twelve seconds to appear.
 */
const MAX_SIMULATE_TICKS = 60 * 8

export class LevelRuntime {
  readonly targets: TargetRuntime[] = []
  readonly dynamicBodies: RAPIER.RigidBody[] = []
  private readonly events: RAPIER.EventQueue
  private readonly targetsByCollider = new Map<number, TargetRuntime>()
  private simulateTicks = 0

  constructor(
    readonly world: RAPIER.World,
    readonly spec: LevelSpec,
    private readonly onSpawn: SpawnListener = () => {},
    private readonly onDespawn: DespawnListener = () => {},
  ) {
    this.events = new R.EventQueue(true)
    for (const object of spec.terrain) this.add(object, 'terrain', false)
    for (const object of spec.structures) this.add(object, 'structure', true)
    for (const target of spec.targets) this.addTarget(target)
    // The broad phase is empty until the first step, so an overlap query run
    // before this would report no collisions at all.
    this.world.step()
  }

  private add(object: ObjectSpec, role: BodyRole, dynamicDefault: boolean, notify = true): RAPIER.RigidBody {
    const spec: BodySpec = {
      shape: object.shape,
      position: object.position,
      dynamic: object.dynamic ?? dynamicDefault,
      ...(object.density !== undefined ? { density: object.density } : {}),
      ...(object.friction !== undefined ? { friction: object.friction } : {}),
      ...(object.restitution !== undefined ? { restitution: object.restitution } : {}),
    }
    const body = addBody(this.world, spec)
    if (spec.dynamic) this.dynamicBodies.push(body)
    if (notify) this.onSpawn({ body, spec, role, ...(object.look ? { look: object.look } : {}) })
    return body
  }

  private addTarget(target: TargetSpec): void {
    // notify=false: the spawn is announced below, once, with the bonus flag.
    const body = this.add(target, 'target', true, false)
    const collider = body.collider(0)
    collider.setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS)
    // Report every contact and let damageFromContactForce decide what counts,
    // so the ignore-threshold lives in one place rather than two.
    collider.setContactForceEventThreshold(0)
    const runtime: TargetRuntime = {
      body,
      colliderHandle: collider.handle,
      maxHealth: target.health,
      health: target.health,
      bonus: target.bonus ?? false,
      destroyed: false,
    }
    this.targets.push(runtime)
    this.targetsByCollider.set(collider.handle, runtime)
    this.onSpawn({ body, spec: { shape: target.shape, position: target.position, dynamic: true }, role: 'target', bonus: runtime.bonus })
  }

  /** Adds a body the player placed or fired. */
  spawn(spec: BodySpec, role: BodyRole): RAPIER.RigidBody {
    const body = addBody(this.world, spec)
    if (spec.dynamic) this.dynamicBodies.push(body)
    this.onSpawn({ body, spec, role })
    return body
  }

  /** One simulation tick: physics, then damage, then bounds. */
  step(): void {
    this.simulateTicks += 1
    this.world.step(this.events)
    this.events.drainContactForceEvents((event) => {
      const damage = damageFromContactForce(event.totalForceMagnitude())
      if (damage <= 0) return
      this.applyDamage(event.collider1(), damage)
      this.applyDamage(event.collider2(), damage)
    })
    this.enforceBounds()
  }

  private outOfBounds(body: RAPIER.RigidBody): boolean {
    const t = body.translation()
    return (
      t.y < this.spec.killLineY ||
      t.y > this.spec.killLineY + BOUNDS_HEIGHT ||
      Math.abs(t.x) > BOUNDS_HALF_WIDTH
    )
  }

  private applyDamage(colliderHandle: number, damage: number): void {
    const target = this.targetsByCollider.get(colliderHandle)
    if (!target || target.destroyed) return
    target.health -= damage
    if (target.health <= 0) this.destroy(target)
  }

  private destroy(target: TargetRuntime): void {
    target.health = 0
    target.destroyed = true
    this.targetsByCollider.delete(target.colliderHandle)
    this.onDespawn(target.body)
    this.world.removeRigidBody(target.body)
  }

  /**
   * Anything that leaves the playfield is gone. A target that leaves counts as
   * destroyed, which is what makes knocking one off a ledge a valid solution
   * (SPEC 2.2); anything else is simply removed.
   */
  private enforceBounds(): void {
    for (const target of this.targets) {
      if (!target.destroyed && this.outOfBounds(target.body)) this.destroy(target)
    }
    for (const body of this.dynamicBodies) {
      if (body.isValid() && this.outOfBounds(body)) {
        this.onDespawn(body)
        this.world.removeRigidBody(body)
      }
    }
  }

  get settled(): boolean {
    if (this.simulateTicks >= MAX_SIMULATE_TICKS) return true
    for (const body of this.dynamicBodies) {
      if (!body.isValid()) continue
      const v = body.linvel()
      if (Math.hypot(v.x, v.y, v.z) > SETTLED_SPEED) return false
    }
    return true
  }

  get outcome(): Outcome {
    return evaluateOutcome(this.targets, this.settled)
  }

  get bonusDestroyed(): boolean {
    const bonus = this.targets.filter((t) => t.bonus)
    return bonus.length > 0 && bonus.every((t) => t.destroyed)
  }

  beginAttempt(): void {
    this.simulateTicks = 0
  }
}
