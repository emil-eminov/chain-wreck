import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three'

/**
 * Screen to world, on the plane the game is played on.
 *
 * Gameplay lives in a shallow slab around z = 0 (SPEC 2.6), so every pointer
 * position maps to exactly one world point. This is what makes a fixed camera
 * worth the constraint: with a free camera, "where did they tap" would be
 * ambiguous.
 */
const PLAY_PLANE = new Plane(new Vector3(0, 0, 1), 0)

const raycaster = new Raycaster()
const ndc = new Vector2()
const hit = new Vector3()

export function pointerToWorld(
  camera: Camera,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): Vector3 | null {
  ndc.set((clientX / width) * 2 - 1, -(clientY / height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  return raycaster.ray.intersectPlane(PLAY_PLANE, hit) ? hit.clone() : null
}
