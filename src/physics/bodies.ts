import type RAPIER from '@dimforge/rapier3d-compat'
import { RAPIER as R, SLAB_HALF_DEPTH } from './world'

export type ShapeSpec =
  | { readonly kind: 'box'; readonly half: readonly [number, number, number] }
  | { readonly kind: 'cylinder'; readonly halfHeight: number; readonly radius: number }
  | { readonly kind: 'sphere'; readonly radius: number }

export interface BodySpec {
  readonly shape: ShapeSpec
  readonly position: readonly [number, number, number]
  /** Fixed bodies are terrain and placed static parts. Dynamic bodies move. */
  readonly dynamic: boolean
  /** Rotation about Z, in radians. The 2.5D view makes Z the tilt axis. */
  readonly rotationZ?: number
  readonly density?: number
  readonly friction?: number
  readonly restitution?: number
  readonly linearDamping?: number
  readonly angularDamping?: number
  /**
   * Continuous collision detection. Needed by anything fast enough to move
   * further in one tick than the thickness of what it should hit: the
   * projectile travels ~0.4m per tick and tunnelled straight through ramps
   * without this.
   */
  readonly ccd?: boolean
}

/** Defaults chosen so wooden-feeling blocks stack without sliding or bouncing. */
const DEFAULT_DENSITY = 1
const DEFAULT_FRICTION = 0.7
const DEFAULT_RESTITUTION = 0.05

export function addBody(world: RAPIER.World, spec: BodySpec): RAPIER.RigidBody {
  const [x, y, z] = spec.position
  const halfAngle = (spec.rotationZ ?? 0) / 2
  const bodyDesc = (spec.dynamic ? R.RigidBodyDesc.dynamic() : R.RigidBodyDesc.fixed())
    .setTranslation(x, y, clampToSlab(z))
    .setRotation({ x: 0, y: 0, z: Math.sin(halfAngle), w: Math.cos(halfAngle) })
    .setLinearDamping(spec.linearDamping ?? 0)
    .setAngularDamping(spec.angularDamping ?? 0)
    .setCcdEnabled(spec.ccd ?? false)
  const body = world.createRigidBody(bodyDesc)

  const colliderDesc = colliderFor(spec.shape)
    .setDensity(spec.density ?? DEFAULT_DENSITY)
    .setFriction(spec.friction ?? DEFAULT_FRICTION)
    .setRestitution(spec.restitution ?? DEFAULT_RESTITUTION)
  world.createCollider(colliderDesc, body)

  return body
}

function colliderFor(shape: ShapeSpec): RAPIER.ColliderDesc {
  switch (shape.kind) {
    case 'box':
      return R.ColliderDesc.cuboid(shape.half[0], shape.half[1], shape.half[2])
    case 'cylinder':
      return R.ColliderDesc.cylinder(shape.halfHeight, shape.radius)
    case 'sphere':
      return R.ColliderDesc.ball(shape.radius)
  }
}

/** Keeps authored levels inside the playable slab even if a JSON value drifts. */
export function clampToSlab(z: number): number {
  return Math.min(Math.max(z, -SLAB_HALF_DEPTH), SLAB_HALF_DEPTH)
}

export function isAsleep(body: RAPIER.RigidBody): boolean {
  return body.isSleeping()
}
