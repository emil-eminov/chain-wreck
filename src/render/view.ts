import type RAPIER from '@dimforge/rapier3d-compat'
import {
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  type Scene,
  SphereGeometry,
  Vector3,
} from 'three'
import { InstanceRegistry, scaleFor, type InstancePool } from './instancing'
import { createMesh } from './ghost'
import { PALETTE } from './palette'
import type { SpawnInfo, BodyRole } from '../levels/runtime'
import type { BuildZone } from '../levels/types'
import type { PartDefinition } from '../parts/types'

const ROLE_COLOUR: Record<BodyRole, number> = {
  terrain: PALETTE.stone,
  structure: PALETTE.crate,
  target: PALETTE.target,
  part: PALETTE.interactive,
  projectile: PALETTE.projectile,
}

const LOOK_COLOUR: Record<string, number> = {
  ground: PALETTE.ground,
  stone: PALETTE.stone,
  roof: PALETTE.roof,
  crate: PALETTE.crate,
}

/** Dots drawn along the predicted flight path while aiming. */
const TRAJECTORY_DOTS = 26

interface Tracked {
  readonly body: RAPIER.RigidBody
  readonly pool: InstancePool
  readonly index: number
  readonly scale: Vector3
}

/**
 * Owns everything drawn. The session knows nothing about it: it announces
 * spawns and despawns, and this turns them into instances.
 */
export class View {
  private tracked: Tracked[] = []
  private instances: InstanceRegistry
  private readonly ghost: Mesh
  private readonly trajectory: InstancedMesh
  private readonly position = new Vector3()
  private readonly rotation = new Quaternion()
  private readonly dummy = new Object3D()
  private readonly decor: Object3D[] = []

  constructor(private readonly scene: Scene) {
    this.instances = new InstanceRegistry(scene)

    this.ghost = createMesh({ kind: 'box', half: [0.9, 0.16, 0.55] }, PALETTE.interactive)
    this.ghost.visible = false
    scene.add(this.ghost)

    this.trajectory = new InstancedMesh(
      new SphereGeometry(0.075, 6, 4),
      new MeshBasicMaterial({ color: PALETTE.projectile, transparent: true, opacity: 0.55 }),
      TRAJECTORY_DOTS,
    )
    this.trajectory.count = 0
    this.trajectory.frustumCulled = false
    scene.add(this.trajectory)
  }

  /**
   * Draws the things that are not physics bodies but that the player must be
   * able to see: where the shot comes from, and where building is allowed.
   */
  setLevelDecor(launcher: readonly [number, number, number], zones: readonly BuildZone[]): void {
    for (const object of this.decor) object.removeFromParent()
    this.decor.length = 0

    const barrel = createMesh({ kind: 'cylinder', halfHeight: 0.5, radius: 0.3 }, PALETTE.launcher)
    ;(barrel.material as MeshStandardMaterial).opacity = 1
    ;(barrel.material as MeshStandardMaterial).transparent = false
    barrel.scale.set(0.34, 1.4, 0.34)
    barrel.rotation.z = -Math.PI / 2
    barrel.position.set(launcher[0], launcher[1], launcher[2])
    barrel.castShadow = true
    this.scene.add(barrel)
    this.decor.push(barrel)

    for (const zone of zones) {
      const box = createMesh({ kind: 'box', half: [0.5, 0.5, 0.5] }, PALETTE.buildZone)
      const material = box.material as MeshStandardMaterial
      material.opacity = 0.12
      material.depthWrite = false
      box.scale.set(zone.max[0] - zone.min[0], zone.max[1] - zone.min[1], 0.4)
      box.position.set(
        (zone.min[0] + zone.max[0]) / 2,
        (zone.min[1] + zone.max[1]) / 2,
        0,
      )
      this.scene.add(box)
      this.decor.push(box)
    }
  }

  /** Drops everything, for a retry or a level change. */
  reset(): void {
    this.instances.dispose()
    this.instances = new InstanceRegistry(this.scene)
    this.tracked = []
  }

  add(info: SpawnInfo): void {
    const pool = this.instances.pool(info.spec.shape.kind)
    const index = pool.acquire((info.look ? LOOK_COLOUR[info.look] : undefined) ?? ROLE_COLOUR[info.role])
    this.tracked.push({ body: info.body, pool, index, scale: scaleFor(info.spec.shape) })
  }

  remove(body: RAPIER.RigidBody): void {
    const at = this.tracked.findIndex((t) => t.body === body)
    if (at === -1) return
    const tracked = this.tracked[at]!
    tracked.pool.release(tracked.index)
    this.tracked.splice(at, 1)
  }

  showGhost(part: PartDefinition, position: readonly [number, number, number], rotationZ: number, valid: boolean): void {
    this.ghost.visible = true
    this.ghost.position.set(position[0], position[1], position[2])
    this.ghost.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), rotationZ)
    this.ghost.scale.copy(scaleFor(part.shape))
    const material = this.ghost.material as MeshStandardMaterial
    material.color.setHex(valid ? PALETTE.interactive : PALETTE.invalid)
  }

  hideGhost(): void {
    this.ghost.visible = false
  }

  /**
   * Draws the flight path as if nothing were in the way. Deliberately naive:
   * showing the true path would hand the player the answer, and the point of
   * the preview is to make aiming readable, not to solve the level.
   */
  showTrajectory(from: readonly [number, number, number], direction: readonly [number, number, number], speed: number): void {
    const length = Math.hypot(...direction) || 1
    const vx = (direction[0] / length) * speed
    const vy = (direction[1] / length) * speed
    for (let i = 0; i < TRAJECTORY_DOTS; i++) {
      const t = i * 0.045
      this.dummy.position.set(from[0] + vx * t, from[1] + vy * t - 4.905 * t * t, from[2])
      this.dummy.scale.setScalar(1 - i / (TRAJECTORY_DOTS * 1.4))
      this.dummy.updateMatrix()
      this.trajectory.setMatrixAt(i, this.dummy.matrix)
    }
    this.trajectory.count = TRAJECTORY_DOTS
    this.trajectory.instanceMatrix.needsUpdate = true
  }

  hideTrajectory(): void {
    this.trajectory.count = 0
  }

  /** Copies physics transforms onto instances. Once per rendered frame. */
  sync(): void {
    for (const item of this.tracked) {
      if (!item.body.isValid()) continue
      const t = item.body.translation()
      const r = item.body.rotation()
      item.pool.set(item.index, this.position.set(t.x, t.y, t.z), this.rotation.set(r.x, r.y, r.z, r.w), item.scale)
    }
    this.instances.flush()
  }
}
