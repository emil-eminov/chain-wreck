import { PerspectiveCamera } from 'three'

/**
 * The camera is fixed (SPEC 2.6). A shallow three-quarter angle reads as 3D
 * while keeping the action close to a plane, so the player never has to judge
 * depth to aim.
 */
export const CAMERA_POSITION = [7.5, 5.5, 11] as const
export const CAMERA_TARGET = [0, 1.6, 0] as const
const FOV_LANDSCAPE = 42

export function createCamera(aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(fovFor(aspect), aspect, 0.1, 200)
  camera.position.set(...CAMERA_POSITION)
  camera.lookAt(...CAMERA_TARGET)
  return camera
}

/**
 * A portrait phone sees far less width at a given fov, so widen as the frame
 * gets narrower. Without this, level 1 is half off-screen on a tall phone.
 */
export function fovFor(aspect: number): number {
  const widened = FOV_LANDSCAPE / Math.min(1, Math.max(0.4, aspect / 1.6))
  return Math.min(widened, 78)
}

/**
 * Frames a level so the launcher and the furthest target are both on screen.
 *
 * The first playable build framed every level identically and cut the launcher
 * off the left edge, which left the player unable to see where the shot would
 * come from.
 */
export function frameLevel(camera: PerspectiveCamera, minX: number, maxX: number, aspect: number): void {
  const centreX = (minX + maxX) / 2
  const span = Math.max(maxX - minX, 6)
  // Enough distance that the span fits the horizontal field of view, with margin.
  const distance = (span / 2 / Math.tan(((fovFor(aspect) * Math.PI) / 180 / 2) * Math.max(aspect, 0.55))) * 1.35
  camera.position.set(centreX + distance * 0.34, 2.4 + distance * 0.34, distance)
  camera.lookAt(centreX, 1.8, 0)
  camera.updateProjectionMatrix()
}

export function resizeCamera(camera: PerspectiveCamera, aspect: number): void {
  camera.aspect = aspect
  camera.fov = fovFor(aspect)
  camera.updateProjectionMatrix()
}
