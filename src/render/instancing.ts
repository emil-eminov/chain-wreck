import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  type Scene,
  SphereGeometry,
  Vector3,
} from 'three'
import type { ShapeSpec } from '../physics/bodies'

/**
 * Every body of the same primitive kind shares one InstancedMesh.
 *
 * Why this exists at the foundation rather than as a later optimisation: with
 * one mesh per body, 80 bodies cost 160 draw calls (colour pass plus shadow
 * pass), which blew the budget in the very first performance run. Instancing
 * makes draw calls a function of how many KINDS of shape exist, not how many
 * objects, so debris can multiply without costing anything to draw.
 *
 * Geometries are unit-sized and scaled per instance, so one box geometry serves
 * a crate, a plank and the ground.
 */

export type ShapeKind = ShapeSpec['kind']

/** Per-kind ceiling. Exceeding it is a bug in the debris budget, not a reason to raise it. */
const CAPACITY = 512

const HIDDEN = new Matrix4().makeScale(0, 0, 0)

function unitGeometry(kind: ShapeKind) {
  switch (kind) {
    case 'box':
      return new BoxGeometry(1, 1, 1)
    // Radius 1, height 1: scale supplies the real dimensions.
    case 'cylinder':
      return new CylinderGeometry(1, 1, 1, 12)
    case 'sphere':
      return new SphereGeometry(1, 12, 8)
  }
}

/** Unit-shape to world scale for a given collider size. */
export function scaleFor(shape: ShapeSpec): Vector3 {
  switch (shape.kind) {
    case 'box':
      return new Vector3(shape.half[0] * 2, shape.half[1] * 2, shape.half[2] * 2)
    case 'cylinder':
      return new Vector3(shape.radius, shape.halfHeight * 2, shape.radius)
    case 'sphere':
      return new Vector3(shape.radius, shape.radius, shape.radius)
  }
}

export class InstancePool {
  private readonly mesh: InstancedMesh
  private readonly free: number[] = []
  private next = 0
  private readonly matrix = new Matrix4()

  constructor(scene: Scene, kind: ShapeKind) {
    const material = new MeshStandardMaterial({ flatShading: true, roughness: 0.85, metalness: 0 })
    this.mesh = new InstancedMesh(unitGeometry(kind), material, CAPACITY)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.count = 0
    // Bodies move every frame; telling three.js not to cull saves a per-frame
    // bounds recompute over hundreds of instances.
    this.mesh.frustumCulled = false
    scene.add(this.mesh)
  }

  acquire(color: number): number {
    const index = this.free.pop() ?? this.next++
    if (index >= CAPACITY) throw new Error(`InstancePool exhausted at ${CAPACITY} instances`)
    this.mesh.count = Math.max(this.mesh.count, index + 1)
    this.mesh.setColorAt(index, new Color(color))
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    return index
  }

  release(index: number): void {
    this.mesh.setMatrixAt(index, HIDDEN)
    this.mesh.instanceMatrix.needsUpdate = true
    this.free.push(index)
  }

  set(index: number, position: Vector3, rotation: Quaternion, scale: Vector3): void {
    this.mesh.setMatrixAt(index, this.matrix.compose(position, rotation, scale))
  }

  flush(): void {
    this.mesh.instanceMatrix.needsUpdate = true
  }

  get used(): number {
    return this.next - this.free.length
  }
}

export class InstanceRegistry {
  private readonly pools = new Map<ShapeKind, InstancePool>()

  constructor(private readonly scene: Scene) {}

  pool(kind: ShapeKind): InstancePool {
    let pool = this.pools.get(kind)
    if (!pool) {
      pool = new InstancePool(this.scene, kind)
      this.pools.set(kind, pool)
    }
    return pool
  }

  flush(): void {
    for (const pool of this.pools.values()) pool.flush()
  }
}
