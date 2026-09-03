import { BoxGeometry, CylinderGeometry, Mesh, MeshStandardMaterial, SphereGeometry } from 'three'
import type { ShapeSpec } from '../physics/bodies'

/**
 * A single, non-instanced mesh. Used only for the placement ghost, which is one
 * object that changes colour and position every frame. Everything that exists
 * in numbers goes through InstancePool instead.
 */
export function createMesh(shape: ShapeSpec, color: number): Mesh {
  const geometry =
    shape.kind === 'box'
      ? new BoxGeometry(1, 1, 1)
      : shape.kind === 'cylinder'
        ? new CylinderGeometry(1, 1, 1, 12)
        : new SphereGeometry(1, 12, 8)
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({ color, flatShading: true, transparent: true, opacity: 0.55, roughness: 0.8 }),
  )
  mesh.castShadow = false
  return mesh
}
