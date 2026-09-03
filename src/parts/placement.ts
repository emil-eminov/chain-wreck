import type RAPIER from '@dimforge/rapier3d-compat'
import { RAPIER as R } from '../physics/world'
import { clampToSlab } from '../physics/bodies'
import type { BuildZone, Vec3 } from '../levels/types'
import type { PartDefinition } from './types'

export type PlacementVerdict = 'ok' | 'outside-zone' | 'blocked'

export interface Placement {
  readonly partId: string
  readonly position: Vec3
  /** Rotation about Z, in radians. The 2.5D view makes Z the tilt axis. */
  readonly rotationZ: number
}

/** Half-extents of a shape's axis-aligned bounds, ignoring rotation. */
function boundsOf(part: PartDefinition): readonly [number, number, number] {
  const shape = part.shape
  switch (shape.kind) {
    case 'box':
      return shape.half
    case 'cylinder':
      return [shape.radius, shape.halfHeight, shape.radius]
    case 'sphere':
      return [shape.radius, shape.radius, shape.radius]
  }
}

/**
 * A rotated box needs a bigger box to contain it. Used so a ramp tilted at 45
 * degrees is not allowed to stick out of its build zone.
 */
export function rotatedHalfExtents(
  half: readonly [number, number, number],
  rotationZ: number,
): readonly [number, number, number] {
  const c = Math.abs(Math.cos(rotationZ))
  const s = Math.abs(Math.sin(rotationZ))
  return [half[0] * c + half[1] * s, half[0] * s + half[1] * c, half[2]]
}

export function insideZones(position: Vec3, half: readonly [number, number, number], zones: readonly BuildZone[]): boolean {
  return zones.some(
    (zone) =>
      position[0] - half[0] >= zone.min[0] &&
      position[0] + half[0] <= zone.max[0] &&
      position[1] - half[1] >= zone.min[1] &&
      position[1] + half[1] <= zone.max[1] &&
      position[2] - half[2] >= zone.min[2] &&
      position[2] + half[2] <= zone.max[2],
  )
}

function colliderFor(part: PartDefinition): RAPIER.Shape {
  const shape = part.shape
  switch (shape.kind) {
    case 'box':
      return new R.Cuboid(shape.half[0], shape.half[1], shape.half[2])
    case 'cylinder':
      return new R.Cylinder(shape.halfHeight, shape.radius)
    case 'sphere':
      return new R.Ball(shape.radius)
  }
}

/**
 * Note: Rapier's broad phase is empty until the world has stepped at least
 * once, and an overlap query against an unstepped world reports no hits at
 * all. LevelRuntime steps once during construction for exactly this reason.
 */
export function overlapsExisting(world: RAPIER.World, part: PartDefinition, position: Vec3, rotationZ: number): boolean {
  const half = Math.sin(rotationZ / 2)
  let hit = false
  world.intersectionsWithShape(
    { x: position[0], y: position[1], z: clampToSlab(position[2]) },
    { x: 0, y: 0, z: half, w: Math.cos(rotationZ / 2) },
    colliderFor(part),
    () => {
      hit = true
      return false
    },
  )
  return hit
}

export function validatePlacement(
  world: RAPIER.World,
  part: PartDefinition,
  position: Vec3,
  rotationZ: number,
  zones: readonly BuildZone[],
): PlacementVerdict {
  if (!insideZones(position, rotatedHalfExtents(boundsOf(part), rotationZ), zones)) return 'outside-zone'
  if (overlapsExisting(world, part, position, rotationZ)) return 'blocked'
  return 'ok'
}
